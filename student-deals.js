import {clean,safeURL,safeDate,checkDateRange} from './sponsor-api-utils.js';
export const DEAL_CATEGORIES=['Хоол, кофе','Хэвлэл, үйлчилгээ','Сургалт','Дэлгүүр','Бусад'];
export const DEAL_PUBLIC_FIELDS=['id','company','title','benefit','conditions','category','school','location','code','target_url','start_at','end_at'];
export function publicDeal(row) {return Object.fromEntries(DEAL_PUBLIC_FIELDS.map(key=>[key,row[key]??'']));}
export function dealFields(input,now=Date.now()) {
  const fields={company:clean(input.company,100),title:clean(input.title,120),benefit:clean(input.benefit,120),conditions:clean(input.conditions,1200),category:clean(input.category,40),school:clean(input.school,180),location:clean(input.location,200),code:clean(input.code,40),target_url:safeURL(input.target_url,true),start_at:safeDate(input.start_at)||new Date(now).toISOString(),end_at:safeDate(input.end_at)};
  if(fields.company.length<2||fields.title.length<3||fields.benefit.length<2||fields.conditions.length<5||!DEAL_CATEGORIES.includes(fields.category)||fields.target_url===null)throw Error('Нэр, санал, нөхцөл, ангилал болон HTTPS холбоосыг шалгана уу.');
  if(!fields.end_at||Date.parse(fields.end_at)<=now)throw Error('Дуусах хугацааг ирээдүйд сонгоно уу.');
  checkDateRange(fields.start_at,fields.end_at);
  return fields;
}
export const DEAL_COLUMN_NAMES='company,title,benefit,conditions,category,school,location,code,target_url,start_at,end_at';
