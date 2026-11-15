import { binding, originOK, readJSON, response, verifiedUser } from '../../../sponsor-api-utils.js';
import { publicListings } from '../../../appwrite-public.js';
import { listingID, recordPublicListing, storeSavedSearch, syncListingMatches } from '../../../saved-listing-searches.js';

export async function onRequestGet(context) {
  const user = await verifiedUser(context.request);
  if (!user) return response({ error: 'Нэвтэрнэ үү.' }, 401);
  try {
    const db = binding(context);
    const { results } = await db.prepare('SELECT id, term, school, created_at FROM saved_listing_searches WHERE owner_id=? ORDER BY created_at DESC, id').bind(user.id).all();
    return response({ searches: results });
  } catch {
    return response({ error: 'Хадгалсан хайлтуудыг ачаалж чадсангүй.' }, 503);
  }
}

export async function onRequestPost(context) {
  if (!originOK(context.request)) return response({ error: 'Энэ сайтаас хүсэлт илгээнэ үү.' }, 403);
  const user = await verifiedUser(context.request);
  if (!user) return response({ error: 'Нэвтэрнэ үү.' }, 401);
  let input;
  try { input = await readJSON(context.request, 2048); }
  catch (error) { return response({ error: error.message }, 400); }
  try {
    const db = binding(context);
    switch (input.action) {
      case 'save': {
        const result = await storeSavedSearch(db, user.id, input);
        if (!result) return response({ error: 'Хайлтын утга, сургуулиа шалгана уу.' }, 400);
        if (result === 'limit') return response({ error: '25 хүртэл хайлт хадгалах боломжтой.' }, 409);
        return response({ ok: true }, result === 'created' ? 201 : 200);
      }
      case 'delete': {
        if (!listingID(input.id) && !/^[\da-f-]{36}$/.test(String(input.id))) return response({ error: 'Хайлтын дугаар буруу байна.' }, 400);
        await db.prepare('DELETE FROM saved_listing_searches WHERE id=? AND owner_id=?').bind(input.id, user.id).run();
        return response({ ok: true });
      }
      case 'inbox': {
        let pending = true;
        try {
          for (let page = 0; page < 3 && pending; page++) pending = await syncListingMatches(db, user.id);
        } catch (error) {
          console.warn('Saved search synchronization:', error.message);
        }
        const [inbox, unread] = await db.batch([
          db.prepare('SELECT listing_id, title, body, created_at, read_at FROM listing_match_notifications WHERE owner_id=? ORDER BY created_at DESC, listing_id LIMIT 60').bind(user.id),
          db.prepare('SELECT count(*) AS count FROM listing_match_notifications WHERE owner_id=? AND read_at IS NULL').bind(user.id),
        ]);
        return response({ notifications: inbox.results, unread: unread.results[0].count, pending });
      }
      case 'read': {
        if (!listingID(input.id)) return response({ error: 'Зарын дугаар буруу байна.' }, 400);
        await db.prepare('UPDATE listing_match_notifications SET read_at=? WHERE owner_id=? AND listing_id=? AND read_at IS NULL')
          .bind(new Date().toISOString(), user.id, input.id).run();
        return response({ ok: true });
      }
      case 'publish': {
        if (!listingID(input.id)) return response({ error: 'Зарын дугаар буруу байна.' }, 400);
        const row = await publicListings([], { id: input.id });
        if (!row || row.user_id !== user.id) return response({ error: 'Таны нийтэд харагдах зар олдсонгүй.' }, 404);
        await recordPublicListing(db, row);
        return response({ ok: true });
      }
      default:
        return response({ error: 'Үйлдэл буруу байна.' }, 400);
    }
  } catch (error) {
    console.warn('Saved listing searches:', error.message);
    return response({ error: 'Үйлдлийг гүйцэтгэж чадсангүй. Дахин оролдоно уу.' }, 503);
  }
}
