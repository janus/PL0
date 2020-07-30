// Basic symbols
const nul  = 0;

//Symbol table
let table = [];
let tx = 0; //Table index
let cx = 0; //code index
let cx0; //initial code index
let tx0; //initial table index

let lev = 0; //Level
let dx = 0; //data allocation index
let dxstack = [];

//Keywords
const beginsym = 11;
const constsym = 12;
const endsym = 3;
const oddsym = 4;
const thensym = 5;
const whilesym = 6;
const callsym = 7;
const dosym = 8;
const ifsym = 9;
const procsym = 13;
const varsym = 14;

const keywords = {
    'begin':beginsym,
    'const':constsym,
    'end': endsym,
    'odd':oddsym,
    'then': thensym,
    'while':whilesym,
    'do':dosym,
    'call':callsym,
    'if':ifsym,
    'procedure':procsym,
    'var':varsym
};

//Operators sysmbols

const plus = 21;
const times = 22;
const lparen = 23;
const eql = 24;
const period = 25;
const lss = 26;
const leq = 27;
const minus = 28;
const slash = 29;
const rparen = 30;
const comma = 31;
const neq = 32;
const gtr = 33;
const geq = 34;
const semicolon = 35;
const becomes = 36;

const ssym = {
    '+': plus,
    '*': times,
    '(': lparen,
    '=': eql,
    '.': period,
    '<': lss,
    '[': leq,
    ';': semicolon,
    '-': minus,
    '/': slash,
    ')': rparen,
    ',': comma,
    '#': neq,
    '>': gtr,
    ']': geq
};

//Machine operator sysmbols
const lit = 1;
const lod = 2;
const cal = 3;
const jmp = 4;
const opr = 5;
const sto = 6;
const int = 7;
const jpc = 8;

const mnemonic = {
    'lit': lit,
    'lod': lod,
    'cal': cal,
    'jmp': jmp,
    'opr': opr,
    'sto': sto,
    'int': int,
    'jpc': jpc
};

const CONSTANT = 40;
const VARIBLE = 41;
const PROC = 42;
const oprSign = "+-*/()=,.#<>[];";


const AMAX = 20345555;
const LEVMAX = 3;
const AL = 10;//Length of identifier
const NMAX = 14; //max. no. of digits in numbers

const UNKNOWN = 0;
const IDENTIFIER = 1;
const NUMBER = 2;
const OPSYM = 3;
const KEYWORD = 4;

let err = 0;
let arrayOfTokens;
let tkIndex = 0;
let tokens = [];
let code = [];

let declbegsys = [constsym, varsym, procsym];
let statbegsys = [beginsym, callsym, ifsym, whilesym];
let facbegsys  = [IDENTIFIER, NUMBER, lparen];

let mksys = [IDENTIFIER, NUMBER, lparen, constsym, varsym, procsym];


let nerror = function(n) {
    console.error(' **** error number' + '<' + n + '>');
    err++;
};

let tokenize = function(string) {
    let len = string.length;
    let i = 0, k = 0;
    let state = UNKNOWN;
    let strAcc = '';
    let numAcc = 0;
    while(i < len) {

        if(state === UNKNOWN) {
            if(" \t\n\r".includes(string[i])) {
                i++;
                continue;
            }
            if(string[i] >= 'a' && string[i] <= 'z') {
                strAcc = string[i];
                state = IDENTIFIER;
            } else if(string[i] >= '0' && string[i] <= '9') {
                numAcc = parseInt(string[i]);
                state = NUMBER;
                k++;
            } else if (ssym[string[i]] !== undefined) {
                if([lparen, rparen].includes(ssym[string[i]])) {
                    tokens.push([ssym[string[i]], ssym[string[i]]]);
                } else tokens.push([OPSYM, ssym[string[i]]]);
            } else if (string[i] === ':') {
                i++;
                if(i < len && string[i] === '=') {
                    tokens.push([OPSYM, becomes]);
                    i++;
                } else {
                    tokens.push([OPSYM, nul]);
                }
                continue;
            } else {
                let message = "Unknown token type <" + string[i] + ">";
                throw new Error(message);
            }
            i++;

        } else if(state === NUMBER) {
            if(string[i] >= '0' && string[i] <= '9') {
                numAcc = numAcc*10 + parseInt(string[i]);
                i++;
                k++;
            } else {
                //This seems not in order. What is k here?
                tokens.push([NUMBER, numAcc]);
                state = UNKNOWN;
                if (k > NMAX) nerror(30);
                k = 0;
            }
            
        } else if(state === IDENTIFIER) {
            if((string[i] >= '0' && string[i] <= '9') || (string[i] >= 'a' && string[i] <= 'z')) {
                strAcc = strAcc + string[i];
                i++;
            } else {
                if(keywords[strAcc] !== undefined) {
                    tokens.push([KEYWORD, keywords[strAcc]]);
                } else {
                    tokens.push([IDENTIFIER, strAcc])
                }
                state = UNKNOWN;
            }
        }
        
    }
    return tokens;
};


let nextToken = function(){
    if(tkIndex < tokens.length){
        return tokens[tkIndex++];
    }
    return [];
};

let unwindToken = function() {
    tkIndex--;
};


let gen = function(operator, arg1 , arg2) {
    code[cx++] = {'f': operator, 'l':arg1, 'a': arg2};

};


let enter = function(k, id, num) {   
    if(k === CONSTANT){
        let val = num > AMAX? 0: num;
        table[tx] = {'name': id, 'kind': k, 'val':val };   
    } else if(k === VARIBLE) {
        table[tx] = {'name': id, 'kind': k, 'level': num, 'adr': dx };
        dx++;
    } else if(k === PROC){
        table[tx] = {'name': id, 'kind': k, 'level': num, 'adr': 0 };
    }
    tx++;
};


let getIdentifierObj = function(name) {
    let i = 0;
    while(i < tx){
        if(table[i]['name']  && table[i]['name'] === name) {
            return table[i];
        }
        i++;
    }
};


let test = function(s1, s2, n) {
    let token = nextToken();
    if(token && !s1.includes(token[0])) {
        nerror(n);
        let ss1 = s1.concat(s2);
        while(token && !ss1.includes(token[1])) {
            token = nextToken();
        }
    }
}


let listcode = function() {
    for(let i = 0; i < cx; i++){
        let codeStr = `${i} ${mnemonic[code[i]['f']]} ${code[i]['a']}`;
        console.log(codeStr);
    }
};


let expression = function(fsys){
    let token = nextToken();
    if(token && [plus, times].includes(token[1])) {
        term(fsys.concat(plus, minus));
        if(token[1] === minus) {
            gen(opr, 0, 1);
        } 
    } else {
        unwindToken();
        term(fsys.concat(plus, minus));
    }

    token = nextToken();
    while(token && [plus, minus].includes(token[1])) {
        term(fsys.concat(plus, minus));
        token[1] === plus? gen(opr,0,2) : gen(opr,0,3);
        token = nextToken();
    }
    unwindToken();
};   

let condition = function(fsys) {
    let token = nextToken();
    if(token[0] === KEYWORD && token[1] === oddsym) {
        expression(fsys);
        gen(opr, 0, 6);
    } else {
        unwindToken();
        expression(fsys.concat(eql, neq, lss, gtr, leq, geq));
        token = nextToken();
        if(![eql, neq, lss, leq, gtr, geq].includes(token[1])) {
            nerror(20);
        } else {
            expression(fsys);
            switch(token[1]) {
                case eql:
                    gen(opr, 0, 8);
                    break;
                case neq:
                    gen(opr, 0, 9);
                    break;
                case lss:
                    gen(opr, 0, 10);
                    break;
                case geq:
                    gen(opr, 0, 11);
                    break;
                case gtr:
                    gen(opr, 0, 12);
                    break;
                case leq:
                    gen(opr, 0, 13);
                    break;
                default:
                    nerror(24); //Unknown operator.
            }
        }

    }
};

let factor = function(symset) {
    let i;
    //Find a way to get facbegsys inside here
    //test(facbegsys, fsys, 24);
    let token = nextToken();
    while(token && mksys.includes(token[0])) {
        //if (count > 5) { console.log(token); break;}
        if(token[0] === IDENTIFIER) {
            let identifier = getIdentifierObj(token[1]);
            if(identifier) {
                console.log(identifier['val'])
                switch(identifier['kind']) {
                    case CONSTANT:
                        gen(lit, 0, identifier['val']);
                        break;
                    case VARIBLE:
                        gen(lod, lev - identifier['level'], identifier['adr']);
                        break;
                    case PROC:
                        throw new Error("Function  not expected in  factor " + token[1]); 
                        break;
                    default:
                        new Error("Unknown token " + token[1]);
                }
            } else {
                throw new Error("Identifier not declared " + token[1]); 
            }
            token = nextToken();
        } else if(token[0] === NUMBER) {
            let num = token[1];
            if(token[1] > AMAX) {
                nerror(30); 
                num = 0;
            }
            gen(lit, 0, num);
            token = nextToken();
        } else if (token[0] === lparen) {
            expression(mksys.concat(rparen));
            token = nextToken();
            if(token[0] !== rparen) {
                nerror(22);
            }
            token = nextToken();
            //test(fsys, [lparen], 23);
        } else {
            new Error("Unknown token " + token[1]);
        }
    }
    unwindToken();
};

let term = function(fsys) {
    let symbols = fsys.concat(times, slash);
    factor(symbols);
    let token = nextToken();
    while(token && [times, slash].includes(token[1])){
        let mulop = token[1]; 
        factor(symbols);
        if(mulop === times) {
            gen(opr, 0, 4);
        } else {
            gen(opr, 0, 5);
        }
        token = nextToken();
    }
    unwindToken();
};

let statement = function(fsys){
    let token = nextToken();
    if(!token) {
        new Error("Sudden end of tokens while looking for statement");
    }
    if(token[0] === IDENTIFIER){ // Assignment statement
        let identifier = getIdentifierObj(token[1]);
        if(!identifier){
            nerror(11);
        } else {
            if(identifier['kind'] === PROC) {
                token = nextToken();
                if(token && token[0] !==  semicolon){
                    unwindToken();
                }
                gen(cal, lev - identifier['level'], identifier['adr']);
                //nerror(12); //Assignment to non-varible
            } else if(identifier['kind'] === VARIBLE){
                token = nextToken();
                
                if(token && token[1] === becomes) {
                    expression(fsys);
    
                } else {
                    unwindToken();
                    nerror(13);
                }
                gen(sto, lev - identifier['level'], identifier['adr']);
            } else {
                nerror(15);
                nerror(14);
                nerror(12);

            }
        }
    } else if(token[1] === ifsym){
        condition([thensym, dosym].concat(fsys));
        token = nextToken();
        if(token && token[1] === thensym){
            cx1 = cx; // May be made local variable later
            gen(jpc, 0, 0);
            statement(fsys);
            code[cx1]['a'] = cx;
        } else {
            nerror(16);
        }
    } else if(token[1] === beginsym) {
        statement(fsys.concat(semicolon, endsym));
        token = nextToken();
        let nfsys = statbegsys.concat(semicolon);
        while(token && nfsys.includes(token[1])){ 
            if(token[1] === semicolon) {
                token = nextToken();
                if(token && token[1] === endsym){
                    break;
                } else {
                    unwindToken();
                }
                statement(fsys.concat(semicolon, endsym));
            } else {
                nerror(10);
            }

            token = nextToken();
        }
        if(token && token[1] !== endsym) {
            nerror(17);
        } else {
            token = nextToken();
            if(token && token[1] !== semicolon) {
                nerror(5);
            }
        }
    } else if(token[1] === whilesym) {
        cx1 = cx;
        condition(fsys.concat(dosym));
        cx2 = cx;
        gen(jpc, 0, 0);
        token = nextToken();
        if(token && token[1] === dosym) {
            statement(fsys);
            gen(jmp, 0, cx1);
            code[cx2]['a'] = cx;
        } else {
            nerror(18);
        }
    } 
    //test(fsys, [], 19);
};

let constdeclaration = function(){
    let token = nextToken();
    if(token && token[0] === IDENTIFIER) {
        let prevToken = token;
        token = nextToken();
        if(token &&  token[1] === eql) {
            token = nextToken();
            if(token && token[0] === NUMBER) {
                enter(CONSTANT, prevToken[1], token[1]);

            } else {
                throw new Error("Expected number but found something else: " + token[1]);
            }
        } else {
            throw new Error("Expected eql but found something else: " + token[1]);
        }
    } else {
        throw new Error("Expected IDENTIFIER but found something else: " + token[1]);
    }
};

let vardeclaration = function(lev){
    let token = nextToken();
    if(token && token[0] === IDENTIFIER) { 
        enter(VARIBLE, token[1], lev);
    } else {
        throw new Error("Expected IDENTIFIER but found something else: " + token[1]); 
    }
};

let block = function(nlev,  fsys) {
    
    lev = nlev;
    let declaration = 0;
    let currentPointerPosition = cx; //This wont work because the object is still empty. Find a work around
    let currentTableIndex = tx === 0 ? tx: tx - 1;
    
    //tx++;
    gen(jmp, 0, 0);
    
    dx = 3;
    let token = nextToken();
    if(lev > LEVMAX) {
        nerror(32);
    } else {
        do {
            if(token && token[1] === constsym) {  
                let extra = 0; 
                declaration = 1;     
                do{
                    if(extra) {
                        unwindToken();
                        extra = 0;
                    }
                    constdeclaration();
                    token = nextToken();
                    while(token && token[1] === comma) {
                        constdeclaration();
                        token = nextToken();
                    }
                    if(token & token[1] !== semicolon) {
                        nerror(5);
                    }
                    token = nextToken();
                    extra = 1;

                } while(token && token[0] === IDENTIFIER)
            }
            if(token && token[1] === varsym) {
                let nextra = 0; 
                declaration = 1;
                do{

                    if(nextra) {
                        unwindToken();
                        nextra = 0;
                    } 
                    vardeclaration(lev);
                    token = nextToken();
                    while(token && token[1] === comma) {
                        vardeclaration(lev);
                        token = nextToken();
                    }
                    if(token & token[1] !== semicolon) {
                        nerror(5);
                    }
                    token = nextToken();
                    nextra = 1;
                  

                } while(token && token[0] === IDENTIFIER)
                //unwindToken(); //This is a hack.
            }
            while(token && token[1] === procsym) {

                token = nextToken();
                if(token && token[0] === IDENTIFIER) {
                    enter(PROC, token[1],  lev);
                } else {
                    nerror(4);
                }
                token = nextToken();
                if(token && token[1] !== semicolon) {
                    nerror(5);
                }
                dxstack.push(dx);
                block(lev+1, fsys.concat(semicolon));
                dx = dxstack.pop();
                token = nextToken();

            }
            //test(statbegsys+[ident], declbegsys, 7)
            //token = nextToken()
        }while(token && declbegsys.includes(token[1]))
        code[currentPointerPosition]['a'] = cx;

        table[currentTableIndex]['adr'] =  cx;
        cx0 = 0;
        gen(int, 0, dx);
        if(declaration) {
            unwindToken();
        }

        statement(fsys.concat(semicolon, endsym));
        gen(opr, 0, 0); //return
        //test(fsys, [], 8); To do
        //listcode();  To do
    }   
};



let interpreter = function(code) {
    let b = 1;
    let s = []; //stack
    let t = 0;
    let p = 0;
    s[0] = 0;
    s[1] = 0;
    s[2] = 0;


    let base = function(l) {
        let b1 = b;
        while(l > 0){
            b1 = s[b1];
            l--;
        }
        return b1;
    };

    console.log('   start pl/0');
    let clen = code.length;
    let codeObj;
    do {
        codeObj = code[p++];
        switch(codeObj['f']){
            case lit:
                t = t + 1;
                s[t] = codeObj['a'];
                break;
            case opr:
                switch(codeObj['a']) {
                    case 0:
                        t = b - 1;
                        p = s[t + 3];
                        b = s[t + 2];
                        break;
                    case 1:
                        s[t] = -s[t];
                        break;
                    case 2:
                        t = t - 1;
                        s[t] = s[t] + s[t + 1];                     
                        break;
                    case 3:
                        t = t - 1;
                        s[t] = s[t] - s[t + 1];
                        break;
                    case 4:
                        t = t - 1;
                        s[t] = s[t] * s[t + 1];
                        break;
                    case 5:
                        t = t - 1;
                        s[t] = s[t] * s[t + 1];
                        break;
                    case 5:
                        t = t - 1;
                        s[t] = s[t] / s[t + 1];
                        break;
                    case 6:
                        s[t] = !s[t];
                        break;
                    case 8:
                        t = t - 1; 
                        s[t] = s[t] === s[t + 1];
                        break;
                    case 9:
                        t = t - 1; 
                        s[t] = s[t] !== s[t + 1];
                        break;
                    case 10:
                        t = t - 1; 
                        s[t] = s[t] < s[t + 1];
                        break;
                    case 11:
                        t = t - 1; 
                        s[t] = s[t] >= s[t + 1];
                        break;
                    case 12:
                        t = t - 1; 
                        s[t] = s[t] > s[t + 1];
                        break;
                    case 13:
                        t = t - 1; 
                        s[t] = s[t] <= s[t + 1];
                }
                break;
            case lod:
                t = t + 1; 
                s[t] = s[base(codeObj['l']) + codeObj['a']];
                break;
            case sto:
                s[base(codeObj['l']) + codeObj['a']] = s[t]; 
                t = t - 1;
                break;
            case cal: //generate new block mark
                s[t + 1] = base(codeObj['l']);
                s[t + 2] = b;
                s[t + 3] = p;
                b = t + 1; 
                p = codeObj['a'];
                break;
            case int:
                t = t + codeObj['a'];
                break;
            case jmp:
                p = codeObj['a'];
                break;
            case jpc:
                if(!s[t]) {
                    p = codeObj['a'];
                    console.log(s[t])
                    t = t - 1;
                }         
        }
    } while(p !== 0 && p < clen)
    console.log('   end pl/0');
};


let str = `procedure gen(x, y,z);
begin if cx > cxmax then
   with code[cx] do
      begin f := x; l := y; a := z
      end;
   cx := cx + 17886
end`;

let strTest0 = `const norw = 11, hot = 90;
txmax = 100;
nmax = 14;
al = 10;
amax = 2047;
levmax = 3;
cxmax = 200;
var i,j,k;
var f;
var p;
n;
m;

procedure error;
var err;
begin err := 1;
end ;

begin 
if 10 = txmax then i := 30;
p := amax; 
error;
f := 0;
while f  < 20 do
begin
f := f + 1;
end;
end;





`

let strTest01 = `var f;`

let strTest02 = `const norw = 11, hot = 90; var f;
 begin
  f := norw +  hot + 10
  end;`

let strTest03 = `(4000 + 233) > (10003 - 9000);`


/** 
gen(opr, 0, 8);
gen(opr, 0, 9);
gen(opr, 0, 10);
gen(opr, 0, 11);
gen(opr, 0, 12);
gen(opr, 0, 13);
//console.log(code)

enter(CONSTANT, 'norw', 400)
enter(VARIBLE, 'nw', 30)
enter(PROC, 'grw', 100)
enter(VARIBLE, 'oop', 230)
//console.log(table)
//console.log(tokenize(strTest0));
//console.log(nextToken())

const lit = 1;
const lod = 2;
const cal = 3;
const jmp = 4;
const opr = 5;
const sto = 6;
const int = 7;
const jpc = 8;


*/
tokenize(strTest0);
//console.log(tokens)

//nextToken();
//vardeclaration(0);
enter(PROC, 'main',  0);
block(0, mksys);
//console.log(table)
console.log(code)
console.log(interpreter(code))