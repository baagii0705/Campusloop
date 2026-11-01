const { Client, Account, Databases, Permission, Role, ID } = require('node-appwrite');
const project=process.env.APPWRITE_FUNCTION_PROJECT_ID||'6ae367b80007a4d31918';
const endpoint=process.env.APPWRITE_FUNCTION_API_ENDPOINT||'https://sgp.cloud.appwrite.io/v1';
const databaseId='public';
module.exports=async({req,res,log,error})=>{
 const fail=(code,message)=>res.json({ok:false,error:message},code);
 try{
  const jwt=req.headers['x-appwrite-user-jwt'];
  if(!jwt)return fail(401,'Нэвтэрч дахин оролдоно уу.');
  const caller=new Client().setEndpoint(endpoint).setProject(project).setJWT(jwt);
  const me=await new Account(caller).get();
  const adminKey=process.env.APPWRITE_API_KEY;
  if(!adminKey)return fail(503,'Chat server API key is not configured');
  const admin=new Databases(new Client().setEndpoint(endpoint).setProject(project).setKey(adminKey));
  const input=JSON.parse(req.bodyText||'{}');
  if(input.action==='createThread'){
   const listing=await admin.getDocument(databaseId,'listings',String(input.listing_id||''));
   if(!listing.user_id||listing.user_id===me.$id)return fail(403,'Энэ зар дээр чат нээх боломжгүй.');
   const existing=await admin.listDocuments(databaseId,'chat_threads',[
    require('node-appwrite').Query.equal('listing_id',listing.$id),
    require('node-appwrite').Query.equal('buyer_id',me.$id)
   ]);
   if(existing.documents.length)return res.json({ok:true,data:existing.documents[0]});
   const participants=[me.$id,listing.user_id];
   const perms=participants.flatMap(id=>[Permission.read(Role.user(id))]);
   const doc=await admin.createDocument(databaseId,'chat_threads',ID.unique(),{
    listing_id:listing.$id,buyer_id:me.$id,seller_id:listing.user_id,created_at:new Date().toISOString()
   },perms);
   return res.json({ok:true,data:doc});
  }
  if(input.action==='sendMessage'){
   const thread=await admin.getDocument(databaseId,'chat_threads',String(input.thread_id||''));
   if(![thread.buyer_id,thread.seller_id].includes(me.$id))return fail(403,'Энэ чатад хандах эрхгүй.');
   const body=String(input.body||'').trim();
   if(!body||body.length>5000)return fail(400,'Мессеж 1–5000 тэмдэгт байх ёстой.');
   const perms=[thread.buyer_id,thread.seller_id].flatMap(id=>[Permission.read(Role.user(id))]);
   const doc=await admin.createDocument(databaseId,'chat_messages',ID.unique(),{
    thread_id:thread.$id,sender_id:me.$id,body,created_at:new Date().toISOString()
   },perms);
   return res.json({ok:true,data:doc});
  }
  return fail(400,'Unsupported action');
 }catch(e){error(e.message);return fail(e.code===401?401:500,'Чат үйлчилгээнд алдаа гарлаа.');}
};