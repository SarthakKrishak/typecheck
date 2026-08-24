export const COMMON_WORDS = [
  "the","be","to","of","and","a","in","that","have","I","it","for","not","on","with","he","as","you","do","at",
  "this","but","his","by","from","they","we","say","her","she","or","an","will","my","one","all","would","there","their","what",
  "so","up","out","if","about","who","get","which","go","me","when","make","can","like","time","no","just","him","know","take",
  "people","into","year","your","good","some","could","them","see","other","than","then","now","look","only","come","its","over","think","also",
  "back","after","use","two","how","our","work","first","well","way","even","new","want","because","any","these","give","day","most","us",
  "find","tell","ask","seem","feel","try","leave","call","good","need","become","between","high","really","something","another","much","family","own","out",
  "leave","while","number","part","turn","start","might","show","course","great","little","hold","run","keep","head","help","follow","around","possible","house",
  "let","great","ask","small","large","big","point","night","country","place","hand","life","still","never","world","those","under","last","never","right",
  "during","today","again","change","play","system","program","data","state","never","case","power","city","business","company","line","problem","fact","service","side",
  "provide","order","develop","present","result","available","market","table","early","build","money","ground","behind","face","important","body","ever","meeting","team","member",
  "number","however","public","group","value","enough","both","until","call","provide","study","water","long","very","after","words","called","just","where","most",
  "know","through","much","before","move","right","too","same","tell","does","set","three","want","air","well","also","play","small","end","put",
  "home","read","hand","port","large","spell","add","even","land","here","must","big","high","such","follow","act","why","ask","men","change",
  "went","light","kind","off","need","house","picture","try","again","animal","point","mother","world","near","build","self","earth","father","head","stand",
  "own","page","should","country","found","answer","school","grow","study","still","learn","plant","cover","food","sun","four","between","state","keep","eye",
  "never","last","let","thought","city","tree","cross","farm","hard","start","might","story","saw","far","sea","draw","left","late","run","while",
  "press","close","night","real","life","few","north","book","carry","took","science","eat","room","friend","began","idea","fish","mountain","stop","north",
  "base","hear","horse","cut","sure","watch","color","face","wood","main","enough","plain","girl","usual","young","ready","above","ever","red","list",
  "though","feel","talk","bird","soon","body","dog","family","direct","leave","song","measure","door","product","black","short","numeral","class","wind","question",
  "happen","complete","ship","area","half","rock","order","fire","south","problem","piece","told","knew","pass","since","top","whole","king","street","inch",
  "multiply","nothing","course","stay","wheel","full","force","blue","object","decide","surface","deep","moon","island","foot","system","busy","test","record","boat"
] as const;

export const CODE_WORDS = [
  "const","let","var","function","return","import","export","async","await","class","extends","implements","interface","type","enum","namespace","module","declare","abstract","static",
  "public","private","protected","readonly","override","super","this","new","delete","typeof","instanceof","in","of","for","while","do","if","else","switch",
  "case","break","continue","try","catch","finally","throw","yield","generator","promise","observable","component","props","state","effect","memo","callback","ref",
  "useState","useEffect","useRef","useMemo","array","object","string","number","boolean","null","undefined","symbol","bigint","map","set","weakMap","weakSet",
  "promise","fetch","request","response","json","http","server","client","database","query","mutation","resolver","schema","model","controller","service","repository","entity","dto",
  "config","environment","deployment","container","docker","kubernetes","pipeline","workflow","git","branch","commit","merge","rebase","cherry","pick","stash","reset","revert","clone",
  "() =>","{ }","=>","===","!==","&&","||","??","?.","...","[]","{}","<>","</>","<div>","import React","export default","console.log","Array.from","Object.keys","Math.random"
] as const;

export function generateWords(count: number, opts: { punctuation?: boolean; numbers?: boolean; code?: boolean } = {}): string[] {
  const source = opts.code ? CODE_WORDS as unknown as string[] : COMMON_WORDS as unknown as string[];
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    let w = source[Math.floor(Math.random() * source.length)];
    if (opts.punctuation && Math.random() < 0.18) {
      const punct = [",", ".", ";", ":", "!", "?", "\"", "'", "(", ")"];
      if (Math.random() < 0.5) w += punct[Math.floor(Math.random() * punct.length)];
      else w = punct[Math.floor(Math.random() * punct.length)] + w;
    }
    if (opts.numbers && Math.random() < 0.12) {
      w = String(Math.floor(Math.random() * 9000) + 100);
    }
    if (opts.code && Math.random() < 0.15) {
      w += "()";
    }
    out.push(w);
  }
  return out;
}
