export function chooseVisualReference<T extends {id:string;title:string}>(prompt:string, assigned:T[], requested?:string):T|undefined {
  if(requested){const found=assigned.find(item=>item.id===requested);if(!found)throw new Error('Visual reference not authorized for workspace');return found;}
  const words=new Set(prompt.toLocaleLowerCase('id').match(/[\p{L}\p{N}]{4,}/gu)||[]);
  const best=assigned.map(item=>({item,score:(item.title.toLocaleLowerCase('id').match(/[\p{L}\p{N}]{4,}/gu)||[]).filter(word=>words.has(word)).length})).sort((a,b)=>b.score-a.score)[0];
  return best?.score?best.item:undefined;
}
