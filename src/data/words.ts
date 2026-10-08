export const COMMON_WORDS = Array.from(new Set([
  "the","be","to","of","and","a","in","that","have","I","it","for","not","on","with","he","as","you","do","at",
  "this","but","his","by","from","they","we","say","her","she","or","an","will","my","one","all","would","there","their","what",
  "so","up","out","if","about","who","get","which","go","me","when","make","can","like","time","no","just","him","know","take",
  "people","into","year","your","good","some","could","them","see","other","than","then","now","look","only","come","its","over","think","also",
  "back","after","use","two","how","our","work","first","well","way","even","new","want","because","any","these","give","day","most","us",
  "find","tell","ask","seem","feel","try","leave","call","need","become","between","high","really","something","another","much","family","own",
  "while","number","part","turn","start","might","show","course","great","little","hold","run","keep","head","help","follow","around","possible","house",
  "let","small","large","big","point","night","country","place","hand","life","still","never","world","those","under","last","right",
  "during","today","again","change","play","system","program","data","state","case","power","city","business","company","line","problem","fact","service","side",
  "provide","order","develop","present","result","available","market","table","early","build","money","ground","behind","face","important","body","ever","meeting","team","member",
  "however","public","group","value","enough","both","until","study","water","long","very","words","called","where",
  "through","before","move","too","same","does","set","three","air","put",
  "home","read","port","spell","add","land","here","must","such","act","why","men",
  "went","light","kind","off","picture","animal","mother","near","self","earth","father","stand",
  "page","should","found","answer","school","grow","learn","plant","cover","food","sun","four","eye",
  "thought","tree","cross","farm","hard","story","saw","far","sea","draw","left","late",
  "press","close","real","few","north","book","carry","took","science","eat","room","friend","began","idea","fish","mountain","stop",
  "base","hear","horse","cut","sure","watch","color","wood","main","plain","girl","usual","young","ready","above","red","list",
  "though","talk","bird","soon","dog","direct","song","measure","door","product","black","short","numeral","class","wind","question",
  "happen","complete","ship","area","half","rock","fire","south","piece","told","knew","pass","since","top","whole","king","street","inch",
  "multiply","nothing","stay","wheel","full","force","blue","object","decide","surface","deep","moon","island","foot","busy","test","record","boat"
])) as unknown as readonly string[];

export const CODE_WORDS = [
  "const","let","var","function","return","import","export","async","await","class","extends","implements","interface","type","enum","namespace","module","declare","abstract","static",
  "public","private","protected","readonly","override","super","this","new","delete","typeof","instanceof","in","of","for","while","do","if","else","switch",
  "case","break","continue","try","catch","finally","throw","yield","generator","promise","observable","component","props","state","effect","memo","callback","ref",
  "useState","useEffect","useRef","useMemo","array","object","string","number","boolean","null","undefined","symbol","bigint","map","set","weakMap","weakSet",
  "fetch","request","response","json","http","server","client","database","query","mutation","resolver","schema","model","controller","service","repository","entity","dto",
  "config","environment","deployment","container","docker","kubernetes","pipeline","workflow","git","branch","commit","merge","rebase","cherry","pick","stash","reset","revert","clone",
  "()=>","{}","=>","===","!==","&&","||","??","?.","...","[]","<>","</>","<div>","React","default","console.log","Array.from","Object.keys","Math.random"
] as const;

export function generateWords(count: number, opts: { punctuation?: boolean; numbers?: boolean; code?: boolean } = {}): string[] {
  const source = opts.code ? CODE_WORDS as unknown as string[] : COMMON_WORDS as unknown as string[];
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    let w = source[Math.floor(Math.random() * source.length)];
    if (opts.punctuation && Math.random() < 0.18) {
      // Suffix-only punctuation — prefix punctuation (",the") is unnatural
      // and punishes readability without training value.
      const punct = [",", ".", ";", ":", "!", "?", '"', "'", ")", "]"];
      w += punct[Math.floor(Math.random() * punct.length)];
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
