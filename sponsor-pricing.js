// Solio introductory advertising prices (MNT). The owner may revise these rates.
export const SPONSOR_RATES=Object.freeze({
  feed:{label:'Зарын дунд — өргөн баннер',description:'Бүх дэлгэцийн өргөнөөр, 6 дахь зарын дараа',prices:{7:15000,30:45000}},
  bottom:{label:'Утасны доод баннер',description:'Утасны доод цэсний дээр тогтмол харагдана',prices:{7:10000,30:30000}},
  both:{label:'Хоёр байрлалд зэрэг',description:'Зарын дунд + утасны доод баннер',prices:{7:22000,30:60000}}
});
export const SPONSOR_DURATIONS=[7,30];
export function sponsorQuote(placement,durationDays){
 const days=Number(durationDays);
 if(!Object.prototype.hasOwnProperty.call(SPONSOR_RATES,placement)||!SPONSOR_DURATIONS.includes(days))return null;
 return SPONSOR_RATES[placement].prices[days];
}
