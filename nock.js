/*
 * For details as to what's going on here, check out Chapter 2 of the Urbit
 * documentation:
 * http://www.urbit.org/2013/11/18/urbit-is-easy-ch2.html
 */

NOCK_VERSION = "5K";
NOCKJS_VERSION = "0.1";

DEBUG = 1;

var indent = 0;

function showDebug(msg) {
	if (DEBUG) {
		for (var i = 0; i < indent; i++) 
			process.stdout.write("    ");
			
		console.log(msg);
	}
}

function increaseIndent() {
	indent++;
}

function decreaseIndent() {
	if (indent > 0) 
		indent--;
}

var YES = 0;
var NO  = 1;

var operators = "[\\?\\+\\=\\/\\*]";
var atom = "[\\d.]+";
var bracket = "[\\[\\]]";

function isOperator(token) {
	var op = "" + token;
	return op.match(operators);
}

function isAtom(token) {
	if (Array.isArray(token)) {
		if (token.length > 1) 
			return false;

		a = "" + token[0];
	}
	else {
		a = "" + token;
	}
	
	return a.match(atom);
}

/*
The following functions make use of the official Urbit rune name conventions.  
This is also to be found in Chapter 2:
http://www.urbit.org/2013/11/18/urbit-is-easy-ch2.html
*/

function _wut(noun, debug) {
    /*
	? :: Test whether a noun is a cell or an atom.
	8  ::    ?[a b]           0
	9  ::    ?a               1
    */

	debug = typeof debug !== 'undefined' ? debug : false;

	if (Array.isArray(noun) && noun.length != 1) {
		if (debug) showDebug("8  ::    ?[a b]           0");
		return YES;
	}
	else {
		if (debug) showDebug("9  ::    ?a               1");
		return NO;
	}
}

function wut(noun, debug) {
    /*
	? :: Test whether a noun is a cell or an atom.
    */
	
	debug = typeof debug !== 'undefined' ? debug : false;

	if (Array.isArray(noun) || 
		typeof noun == 'string' && noun[0] == "[" && noun[noun.length-1] == "]") {
		if (debug) showDebug("4  ::    ?[a b]            0");
		return YES;
	}
	else {
		if (debug) showDebug("5  ::    ?a                1");
		return NO;
	}
}

function structureList(list) {
    /* Properly structure an improper list.
    2  ::    a b c]           a [b c]]
    */ 

	// If this list is actually an atom
	if (wut(list) == NO)
		return list;

    if (list.length == 1) {
		if (wut(list[0]) == YES) 
			return [structureList(list[0]), 0];
		else 
			return [list[0], 0];
    }
    else if (list.length == 2) {
		return [structureList(list[0]), structureList(list[1])];
    }
    else {
		// 2  ::    a b c]           a [b c]]
		showDebug("2  ::    a b c]           a [b c]]");

		increaseIndent();
		showDebug("[b c]");
		var c = structureList(list.pop());
		var b = structureList(list.pop());
		var cell = [b, c];
		showDebug(formatList(cell));

		decreaseIndent();

		list.push(cell);

		showDebug("");
		showDebug(formatList(list));

        return structureList(list);
    }
}

function _lus(noun) {
    /*
	+ :: Increment an atom.
	10 ::    +[a b]           +[a b]
	11 ::    +a               1 + a
	*/

	if (_wut(noun, false) == YES) {
		showDebug("10 ::    +[a b]           +[a b]");
		return(noun);
	}
	else { 
		showDebug("11 ::    +a               1 + a");
		var atom = Array.isArray(noun) ? noun[0] : noun;
		showDebug("1 + " + atom);
		return 1 + parseInt(atom);
	}
}

function lus(noun) {
    /*
	+ :: Increment an atom.
    6  ::    +[a b]            +[a b]
    7  ::    +a                1 + a
	*/

	if (wut(noun) == YES) {
    	showDebug("6  ::    +[a b]            +[a b]");
		showDebug("CRASH!");
		return "+" + formatList(noun);
	}
	else {
		showDebug("7  ::    +a                1 + a");
		return parseInt(noun) + 1;
	}
}

function _tis(noun) {
	/*
    = :: test for equality
	12 ::    =[a a]           0
	13 ::    =[a b]           1
	14 ::    =a               =a
	*/
	if (_wut(noun, false) == NO) {
		showDebug("14 ::    =a               =a");
		return noun;
	}
	else if (noun[1] == noun[2])  {
    	showDebug("12 ::    =[a a]           0");
		return YES;
	}
	else {
    	showDebug("12 ::    =[a b]           1");
		return NO;
	}
}

function tis(noun) {
	/*
    = :: test for equality
    8  ::    =[a a]            0
    9  ::    =[a b]            1
	10 ::    =a                =a
    */
	if (wut(noun) == NO) {
		showDebug("10 ::    =a                =a");
		showDebug("CRASH!");
		return "=" + noun;
	}
	else if (noun[0] == noun[1])  {
    	showDebug("8  ::    =[a a]            0");
		return YES;
	}
	else {
    	showDebug("9  ::    =[a b]            1");
		return NO;
	}
}

function hasTwoItems(list) {
	/*
	 * Returns true if the (properly structured) list has two or more items in it
	 */

	return (wut(list) == YES && list.length >= 2);
}

function hasThreeItems(list) {
	/*
	 * Returns true if the (properly structured) list has three or more items in it
	 */

	return (hasTwoItems(list) && hasTwoItems(list[1]));
}

function _fas(noun) {
	/*
    Return the specified slot from the given noun.
	16 ::    /[1 a]           a
	17 ::    /[2 a b]         a
	18 ::    /[3 a b]         b
	19 ::    /[(a + a) b]     /[2 /[a b]]
	20 ::    /[(a + a + 1) b] /[3 /[a b]]
	21 ::    /a               /a
	*/
	
	if (isAtom(noun)) { 
		showDebug("21 ::    /a               /a");
		return noun;
	}

	var newNoun = noun.slice(0);

	var sel = newNoun.shift();

	var axis = shiftNoun(newNoun);
	var tree = shiftNoun(newNoun);

	if (_wut(axis, false) == YES) {
		showDebug("21 ::    /a               /a");
		return noun;
	}

	if (axis == 1) {
		showDebug("16 ::    /[1 a]           a");
		return tree;
	}

	var newTree = tree.slice(1);

	if (_wut(newTree, false) == NO) {
		showDebug("21 ::    /a               /a");
		return noun;
	}

	var a = shiftNoun(newTree);
	var b = shiftNoun(newTree);

	if (axis == 2) {
		showDebug("17 ::    /[2 a b]         a");
		return a;
	}
	else if (axis == 3) {
		showDebug("18 ::    /[3 a b]         b");
		return b;
	}
	else if (!(axis % 2)) {
		showDebug("19 ::    /[(a + a) b]     /[2 /[a b]]");
		return [].concat("/", "[", 2, "/", "[", axis / 2, tree, "]", "]");
	}
	else {
		showDebug("20 ::    /[(a + a + 1) b] /[3 /[a b]]");
		return [].concat("/", "[", 3, "/", "[", (axis-1) / 2, tree, "]", "]");
	}
}

function fas(list) {
	/*
    Return the specified slot from the given noun.
    12 ::    /[1 a]            a
    13 ::    /[2 a b]          a
    14 ::    /[3 a b]          b
    15 ::    /[(a + a) b]      /[2 /[a b]]
    16 ::    /[(a + a + 1) b]  /[3 /[a b]]
    17 ::    /a                /a
    */

	if (wut(list) == NO) {
    	showDebug("17 ::    /a                /a");
		showDebug("CRASH!");
		return "/" + list;
	}

	if (!hasTwoItems(list)) 
		throw Error("Invalid arguments for the / operator");

	var n = list[0];
	/*
	if (list.length == 2) 
		noun = structureList(list[1]) ;
	else
		noun = structureList(list.slice(1));
	*/

	if (n == 1) {
		showDebug("12 ::    /[1 a]            a");
		return noun;
	}

	if (!hasThreeItems(list)) 
		throw Error("Invalid arguments for the / operator");

	if (n == 2) {
		showDebug("13 ::    /[2 a b]          a");
		return noun[0];
	}
	else if (n == 3) {
		showDebug("14 ::    /[3 a b]          b");
		return noun[1];
	}
	// #15, even slot index
    else if (!(n % 2)) {
		showDebug("15 ::    /[(a + a) b]      /[2 /[a b]]");
		showDebug("/[2 /[" + n / 2 + " " + formatList(noun) + "]]");

		increaseIndent();

		showDebug("/[a b]");
		showDebug("/" + formatList([ (n / 2), noun]));
		var innerFas = fas([ n/2, noun]);
		showDebug(formatList(innerFas))

		decreaseIndent();

		showDebug("");
		showDebug("/[2 " + formatList(innerFas) + "]");
		var outerFas = fas([2, innerFas]);


		return outerFas;
	}
	// #16, odd slot index
    else {
		showDebug("16 ::    /[(a + a + 1) b]  /[3 /[a b]]");
		showDebug("/[3 /[" + (n-1) / 2 + " " + formatList(noun) + "]]");

		increaseIndent();

		showDebug("/[a b]");
		showDebug("/" + formatList([((n-1) / 2), noun]));
		var innerFas = fas([ (n-1) / 2, noun]);
		showDebug(formatList(innerFas));

		decreaseIndent();
		showDebug("/" + formatList([3, innerFas]));
		var outerFas = fas([3, innerFas]);


		return outerFas;

	}
}

OP_FAS = 0;
OP_CON = 1;
OP_TAR = 2;
OP_WUT = 3;
OP_LUS = 4;
OP_TIS = 5;
OP_IF  = 6;
OP_H07 = 7;
OP_H08 = 8;
OP_H09 = 9;
OP_H10 = 10;

function _tar(noun) {
	/* Apply the Nock formula
	23 ::    *[a [b c] d]     [*[a b c] *[a d]]
	24 ::
	25 ::    *[a 0 b]         /[b a]
	26 ::    *[a 1 b]         b
	27 ::    *[a 2 b c]       *[*[a b] *[a c]]
	28 ::    *[a 3 b]         ?*[a b]
	29 ::    *[a 4 b]         +*[a b]
	30 ::    *[a 5 b]         =*[a b]
	31 ::
	32 ::    *[a 6 b c d]     *[a 2 [0 1] 2 [1 c d] [1 0] 2 [1 2 3] [1 0] 4 4 b]
	33 ::    *[a 7 b c]       *[a 2 b 1 c]
	34 ::    *[a 8 b c]       *[a 7 [[7 [0 1] b] 0 1] c]
	35 ::    *[a 9 b c]       *[a 7 c 2 [0 1] 0 b]
	36 ::    *[a 10 [b c] d]  *[a 8 c 7 [0 3] d]
	37 ::    *[a 10 b c]      *[a c]
	38 ::
	39 ::    *a               *a
	*/
	
	if (_wut(noun, false) == NO) {
		showDebug("39 ::    *a               *a");
		return noun;
	}

	var newNoun = noun.slice(0);

	var sel = newNoun.shift();

	var subject = shiftNoun(newNoun);
	var formula = shiftNoun(newNoun);

	if (_wut(formula, false) == NO) {
		showDebug("39 ::    *a               *a");
		return noun;
	}

	sel = formula.shift();
	ser = formula.pop();
	var operator = shiftNoun(formula);
	var operands = formula;

	if (_wut(operator, false) == YES) {
		showDebug("23 ::    *[a [b c] d]     [*[a b c] *[a d]]");
		return [].concat("[", "*", "[", subject, operator, "]", 
						      "*", "[", subject, operands, "]", "]");
	}

	// FAS
	if (operator == 0) {
		showDebug("25 ::    *[a 0 b]         /[b a]");
		return [].concat("/", "[", operands, subject, "]");
	}
	// Ignore the subject
	else if (operator == 1) {
		showDebug("26 ::    *[a 1 b]         b");
		return operands;
	}
	// Generate a new subject
	else if (operator == 2) {
		if (_wut(operands, false) == NO) {
			showDebug("39 ::    *a               *a");
			return noun;
		}

		sel = operands.shift();
		var b = shiftNoun(operands);
		var c = shiftNoun(operands);

		showDebug("27 ::    *[a 2 b c]       *[*[a b] *[a c]]");
		showDebug("a: " + nounToString(subject));
		showDebug("b: " + nounToString(b));
		showDebug("c: " + nounToString(c));
		return [].concat("*", "[", "*", "[", subject, b, "]",
								   "*", "[", subject, c, "]", "]");
	}
	// WUT
	else if (operator == 3) { 
		showDebug("28 ::    *[a 3 b]         ?*[a b]");
		return [].concat("?", "*", "[", subject, operands, "]");
	}
	// LUS
	else if (operator == 4) {
		showDebug("29 ::    *[a 4 b]         +*[a b]");
		return [].concat("+", "*", "[", subject, operands, "]");
	}
	// TIS
	else if (operator == 5) {
		showDebug("30 ::    *[a 5 b]         =*[a b]");
		return [].concat("=", "*", "[", subject, operands, "]");
	}
	// if-then-else
	else if (operator == 6) {
		if (_wut(operands, false) == NO) {
			showDebug("39 ::    *a               *a");
			return noun;
		}

		sel = operands.shift();
		var b = shiftNoun(operands);
		if (_wut(operands, false) == NO) {
			showDebug("39 ::    *a               *a");
			return noun;
		}

		sel = operands.shift();
		var c = shiftNoun(operands);
		var d = shiftNoun(operands);
		showDebug(
"32 ::    *[a 6 b c d]     *[a 2 [0 1] 2 [1 c d] [1 0] 2 [1 2 3] [1 0] 4 4 b]");

		return [].concat("*", "[", subject, 2, "[", 0, 1, "]", 2, 
							  "[", 1, c, d, "]",
							  "[", 1, 0, "]", 2, 
							  "[", 1, 2, 3, "]",
							  "[", 1, 0, "]", 4, 4, b, "]");
							  
	}
	else if (operator == 7) {
		if (_wut(operands, false) == NO) {
			showDebug("39 ::    *a               *a");
			return noun;
		}

		sel = operands.shift();
		var b = shiftNoun(operands);
		var c = shiftNoun(operands);

		showDebug("33 ::    *[a 7 b c]       *[a 2 b 1 c]");
		return [].concat("*", "[", subject, 2, b, 1, c, "]");
	}
	else if (operator == 8) {
		if (_wut(operands, false) == NO) {
			showDebug("39 ::    *a               *a");
			return noun;
		}

		sel = operands.shift();
		var b = shiftNoun(operands);
		var c = shiftNoun(operands);

		showDebug("34 ::    *[a 8 b c]       *[a 7 [[7 [0 1] b] 0 1] c]");
		return [].concat("*", "[", subject, 7, "[", "[", 7, "[", 0, 1, "]",
						 b, "]", 0, 1, "]", c, "]");
	}
	else if (operator == 9) {
		if (_wut(operands, false) == NO) {
			showDebug("39 ::    *a               *a");
			return noun;
		}

		sel = operands.shift();
		var b = shiftNoun(operands);
		var c = shiftNoun(operands);

		showDebug("35 ::    *[a 9 b c]       *[a 7 c 2 [0 1] 0 b]");
		return [].concat("*", "[", subject, 7, c, 2, "[", 0, 1, "]", 0, b, "]");
	}
	else if (operator == 10) {
		if (_wut(operands, false) == NO) {
			showDebug("39 ::    *a               *a");
			return noun;
		}

		sel = operands.shift();
		ser = operands.pop();
		var firstOperand = shiftNoun(operands);

		if (_wut(firstOperand, false) == NO) {
			var b = firstOperand;
			var c = operands;

			showDebug("37 ::    *[a 10 b c]      *[a c]");
			return [].concat("*", "[", subject, c, "]");
		}

		sel = firstOperand.shift();
		var b = shiftNoun(firstOperand);
		var c = shiftNoun(firstOperand);

		var d = shiftNoun(operands);


		showDebug("36 ::    *[a 10 [b c] d]  *[a 8 c 7 [0 3] d]");
		return [].concat('*', '[', subject, 8, c, 7, '[', 0, 3, ']', d, ']');
	}

	// If we get all the way down here, nothing applied, the operator is
	// greater than 10.  So apply line 39
	showDebug("39 ::    *a               *a");
	return noun;

}

function tar(noun) {
    /*
	* -- Reduce a Nock expression.
    19 ::    *[a [b c] d]      [*[a b c] *[a d]]
    21 ::    *[a 0 b]          /[b a]
    22 ::    *[a 1 b]          b
    23 ::    *[a 2 b c]        *[*[a b] *[a c]]
    24 ::    *[a 3 b]          ?*[a b]
    25 ::    *[a 4 b]          +*[a b]
    26 ::    *[a 5 b]          =*[a b]
    28 ::    *[a 6 b c d]      *[a 2 [0 1] 2 [1 c d] [1 0] 2 [1 2 3] [1 0] 4 4 b]
    29 ::    *[a 7 b c]        *[a 2 b 1 c]
    30 ::    *[a 8 b c]        *[a 7 [[7 [0 1] b] 0 1] c]
	31 ::    *[a 9 b c]        *[a 7 c 2 [0 1] 0 b]
	32 ::    *[a 10 [b c] d]   *[a 8 c 7 [0 3] d]
	33 ::    *[a 10 b c]       *[a c]

	35 ::    *a                *a
    */

	var nounString = JSON.stringify(noun);
    //noun = structureList(noun);

	if (wut(noun) == NO) {
		showDebug("35 ::    *a                  *a");
		showDebug("CRASH!");
		return "*" + noun;
	}

	if (!hasThreeItems(noun)) {
		throw Error("Invalid parameters for tar: " + nounString);
	}

    var a = noun[0];
	var op = noun[1][0];
    var obj = noun[1][1];
	
	// #19
	if (wut(op) == YES) {
		showDebug("19 ::    *[a [b c] d]      [*[a b c] *[a d]]");

		increaseIndent();
		showDebug("*[a b c]");
		showDebug("*" + formatList([a, op]));
		var tar1 = tar([a, op]);

		showDebug("");
		showDebug("*[a d]");
		showDebug("*" + formatList([a, obj]));
		var tar2 = tar([a, obj]);

		decreaseIndent();

		return [tar1, tar2];
	}
	// #21: tree addressing
	else if (op == OP_FAS) {
    	showDebug("21 ::    *[a 0 b]          /[b a]");
		showDebug("/" + formatList([obj, a]));
		return fas([obj, a]);
	}
	// #22: constant operator
	else if (op == OP_CON) {
		showDebug("22 ::    *[a 1 b]          b");
		return obj;
	}
	// #23: recursion
	else if (op == OP_TAR) { 
		showDebug("23 ::    *[a 2 b c]        *[*[a b] *[a c]]");

		if (!hasTwoItems(obj))
			throw Error("Invalid arguments for the 2 operator");

		b = obj[0];
		c = obj[1];
		
		increaseIndent();
		showDebug("*[a b]");
		showDebug("*" + formatList([a, b]));
		var tar1 = tar([a, b]);
		showDebug(formatList(tar1));

		showDebug("");
		showDebug("*[a c]");
		showDebug("*" + formatList([a, c]));
		var tar2 = tar([a, c]);
		showDebug(formatList(tar2));

		decreaseIndent();

		showDebug("");
		showDebug("*[*[a b] *[a c]]");
		showDebug("*" + formatList([tar1, tar2]));

		return tar([tar1, tar2]);
	}
	// #24: ?
	else if (op == OP_WUT) { 
		showDebug("24 ::    *[a 3 b]          ?*[a b]");

		increaseIndent();
		showDebug("*[a b]");
		showDebug("*" + formatList([a, obj]));
		tar = tar([a, obj]);
		showDebug(formatList(tar));

		decreaseIndent();

		showDebug("");
		showDebug("?*[a b]");
		showDebug("?" + formatList(tar));

		return wut(tar, true);
	}
	// #25: +
	else if (op == OP_LUS) { 
		showDebug("25 ::    *[a 4 b]          +*[a b]");

		increaseIndent();
		showDebug("*[a b]");
		showDebug("*" + formatList([a, obj]));
		tar = tar([a, obj]);
		showDebug(formatList(tar));

		decreaseIndent();

		showDebug("");
		showDebug("+*[a b]");
		showDebug("+" + formatList(tar));

		return lus(tar);
	}
	// #26: =
	else if (op == OP_TIS) { 
		showDebug("<- 26 ::    *[a 5 b]          =*[a b]");

		increaseIndent();
		showDebug("*[a b]");
		showDebug("*" + formatList([a, obj]));
		tar = tar([a, obj]);
		showDebug(formatList(tar));

		decreaseIndent();

		showDebug("");
		showDebug("=*[a b]");
		showDebug("=" + formatList(tar));

		return tis(tar);
	}
	// #28: if
	else if (op == OP_IF) { 
		showDebug("28 ::    *[a 6 b c d]      *[a 2 [0 1] 2 [1 c d] [1 0] 2 [1 2 3] [1 0] 4 4 b]");
		if (!hasThreeItems(obj))
			throw Error("Invalid arguments for the 6 operator");

		b = obj[0];
		c = obj[1][0];
		d = obj[1][1];

		var params = 
			[a, 2, [0, 1], 2, [1, c, d], [1, 0], 2, [1, 2, 3], [1, 0], 4, 4, b]; 
		showDebug("*" + formatList(params));
		return tar(params);
		// The reduced version:
		//return tar([a, tar([[c, d], [0, tar([[2, 3], 
		//			[0, lus(lus(tar([a, b])))]])]])]);
	}
	// #29: Function composition
	else if (op == OP_H07) {
		showDebug("29 ::    *[a 7 b c]        *[a 2 b 1 c]");
		if (!hasTwoItems(obj))
			throw Error("Invalid arguments for the 7 operator");

		b = obj[0];
		c = obj[1];
		var params = [a, 2, b, 1, c]; 
		showDebug("*" + formatList(params));
		return tar(params);
		// The reduced version:
		//return  tar([tar([a, b]), c]);
	}
	// #30: function composition with ordered pair
	else if (op == OP_H08) {
		showDebug("30 ::    *[a 8 b c]        *[a 7 [[7 [0 1] b] 0 1] c]");
		if (!hasTwoItems(obj))
			throw Error("Invalid arguments for the 8 operator");

		b = obj[0];
		c = obj[1];

		// TODO: This uses the reduction from Chap 2's appendix.  The unreduced
		// version doesn't quite work as expected.
		//return tar([a, 7, [[7, [0, 1], b], 0, 1], c]); 
		return tar([[tar([a, b]),  a], c]);
	}
	// #31: core
	else if (op == OP_H09) {
		showDebug("31 ::    *[a 9 b c]        *[a 7 c 2 [0 1] 0 b]");
		if (!hasTwoItems(obj))
			throw Error("Invalid arguments for the 9 operator");

		b = obj[0];
		c = obj[1];

		// TODO: Don't have any kind of test code for this.  The decrement
		// routine in chapter 2 makes use operation 9, and that totally doesn't
		// work at all.
		//
		var params = [a, 7, c, 2, [0, 1], 0, b]; 
		showDebug("*" + formatList(params));
		return tar(params);
	}
	else if (op == OP_H10) {
		if (!hasTwoItems(obj)) 
				throw Error("Invalid arguments for the 10 operator");

		hint = obj[0];
		if (wut(hint) == YES) {
			if (!hasTwoItems(obj[0])) 
				throw Error("Invalid arguments for the 10 operator");
				
			showDebug("32 ::    *[a 10 [b c] d]   *[a 8 c 7 [0 3] d]");
			c = obj[0][1];
			d = obj[1];

			// TODO: No test for this either.  See above about decrement,
			// though.
			var params = [a, 8, c, 7, [0, 3], d];
			showDebug("*" + formatList(params));
			return tar(params);
			// The reduced version:
			//return tar([a d])
		}
		else {
			showDebug("33 ::    *[a 10 b c]       *[a c]");
			var params = [subj, obj[1]];
			showDebug("*" + formatList(params));
			return tar([subj, obj[1]]);
		}
	}
}

function tokenize(str) {
	/* 
	 * Returns an array of tokens for a given nock expression
	 */

	var original = str;
	var tokens = [];

	while (str != "") {
		var operators_regex = new RegExp("^(" + operators + ")\\s*(.*)");
		var atom_regex = new RegExp("^(" + atom + ")\\s*(.*)");
		var bracket_regex = new RegExp("^\\s*(" + bracket + ")\\s*(.*)");

		// If it's an operator
		if ((match = str.match(operators_regex)) != null) {
			tokens.push(match[1]);
			str = match[2];
		}
		// If it's an atom
		else if ((match = str.match(atom_regex)) != null) {
			tokens.push(match[1]);
			str = match[2];
		}
		// If it's either sort of bracket
		else if ((match = str.match(bracket_regex)) != null) {
			tokens.push(match[1]);
			str = match[2];
		}
		else {
			throw Error("Invalid expression: \"" + original + "\"");
		}
	}

	return tokens;
}

function nounToString(tokens) {
	var str = "";

	if (!Array.isArray(tokens)) {
		return '' + tokens;
	}

	for (i = 0; i < tokens.length; i++) {
		token = tokens[i];

		if (isAtom(token) && tokens.length > i+1 && tokens[i+1] != "]") 
			str += token + " ";
		else if (token == "]" && tokens.length > i+1 && tokens[i+1] != "]")
			str += token + " ";
		else 
			str += token;
	}

	return str;
}

function popNoun(expr) {
	/*
	 * Remove the last noun in the list of tokens.  
	 * This routine is optimistic, in that it assumes that if a token is not a
	 * valid operator, it's a valid atom.  This also doesn't check if it's a
	 * pair, it just makes sure the brackets are balanced.
	 * If the last token on the list is an operator, it returns that, even
	 * though that's totally not a noun.  Otherwise, this would not work with
	 * nested operations, (e.g. *[*[1 2] *[3 4]]).
	 */

	var token = expr.pop();

	if (token == "]") {
		var noun = [];
		while (expr[expr.length-1] != "[") {
			var newNoun = popNoun(expr);

			if (Array.isArray(newNoun)) {

				for (var i = newNoun.length-1; i >= 0; i--) {
					noun.unshift(newNoun[i]);
				}
			}
			else {
				noun.unshift(newNoun);
			}
		}

		noun.unshift(expr.pop());

		noun.push(token);

		if (isOperator(expr[expr.length-1])) {
			noun.unshift(expr.pop());
		}

		return noun;
	}	
	else {
		return token;
	}
}

function shiftNoun(expr) {
	/*
	 * Remove the first noun in the list of tokens.  
	 * This routine is optimistic, in that it assumes that if a token is not a
	 * valid operator, it's a valid atom.  This also doesn't check if it's a
	 * pair, it just makes sure the brackets are balanced.
	 * This will also return the operator (e.g. the wut in "?[1 2]"), even 
	 * though that's not technically a noun.
	 */

	var noun = [];

	var token = expr.shift();

	var op;
	if (isOperator(token)) {
		op = token;
		token = expr.shift();
	}
	
	if (token == "[") {
		while (expr[0] != "]") {
			var newNoun = shiftNoun(expr);

			if (Array.isArray(newNoun)) {
				for (var i = 0; i < newNoun.length; i++) {
					noun.push(newNoun[i]);
				}
			}
			else {
				noun.push(newNoun);
			}
		}

		noun.push(expr.shift());

		noun.unshift(token);

		if (op) {
			noun.unshift(op);
		}

		return noun;
	}	
	else {
		if (op) 
			return [op, token];
		else 
			return token;
	}
}

function indexOfNextOperator(noun) {
	for (var i = 1; i < noun.length; i++) {
		if (isOperator(noun[i])) 
			return i;
	}

	return -1;
}

function nounsAreTheSame(expr1, expr2) {
	return nounToString(expr1) == nounToString(expr2);
}

function validateNoun(noun) {

	// Any number of operators are (theoretically) valid.
	var index = 0;
	while (isOperator(noun[index])) 
		index++;

	// Just operators (optionally) and an atom is valid
	if (noun.length == index+1) {
		return isAtom(noun[index]);
	}

	// Make sure we either start with a [ or with an op[
	if (noun[index] != "[") 
		return false;

	// The final token should be ]
	if (noun[noun.length-1] != "]")
		return false;

	return true;
}

function addBrackets(noun) {
	/*
	 6  ::    [a b c]          [a [b c]]
	 Take an array of tokens.  If there's a bracket with three (or more) 
	 nouns, add brackets for the last two nouns.  
	 Otherwise, return the token array unchanged.
	 In the process of which, validate that there's nothing off about this noun
	 */
	
	if (!Array.isArray(noun) || noun.length <= 2)
		return noun;

	var newNoun = noun.slice(0);

	// The last character should be "]"
	var ser = newNoun.pop();

	var c = popNoun(newNoun);

	// Recursive call to add brackets to this noun, possibly
	var newC = addBrackets(c);

	if (!nounsAreTheSame(newC, c)) 
		return newNoun.concat(newC, ser);

	// Don't allow a cell with one item
	if (newNoun[newNoun.length-1] == "[") 
		throw Error("Can't add brackets to expression: " + nounToString(noun));

	var b = popNoun(newNoun);

	var newB = addBrackets(b);
	if (!nounsAreTheSame(newB, b)) 
		return newNoun.concat(newB, c, ser);

	// At this point if we have a "[", this rule doesn't apply
	if (newNoun[newNoun.length-1] == "[") {
		return noun;
	}

	showDebug("b: " + nounToString(b));
	showDebug("c: " + nounToString(c));

	return newNoun.concat("[", b, c, "]", ser);
}

function evalNock(str) {
	/*
	 * Take a string of nock pseudocode and run through the reductions until we
	 * detect a crash or get a value.
	 */
	
	if (DEBUG > 1) console.log("Evaluating: '" + str + "'");

	var operatorRegex = "^" + operators;
	if (!isOperator(str)) {
	 	showDebug("5  ::    nock(a)             *a");
		str = "*" + str;
		showDebug(str);
	}

	var tokens = tokenize(str);

	var noun = shiftNoun(tokens.slice(0));

	if (noun.length != tokens.length) 
		throw Error("Invalid expression: " + nounToString(tokens));

	return nounToString(reduceNoun(noun));

}

function reduceNoun(noun) {
	var done = false;

	while (!done) {
		showDebug("Reducing " + nounToString(noun));

		if (!validateNoun(noun)) {
			showDebug("Can't validate this: " + noun);
			throw Error("Invalid expression: " +nounToString(noun));
		}

		// See if there are any sub-operations that need to be dealt with
		var opIndex = indexOfNextOperator(noun);

		if (opIndex != -1) {
			var left = noun.slice(0, opIndex);
			var right = noun.slice(opIndex);
			var subNoun = shiftNoun(right);

			increaseIndent();

			var newSubNoun = reduceNoun(subNoun);

			if (nounsAreTheSame(newSubNoun, subNoun)) {
				showDebug("CRASH!");
				noun.unshift(op);
				done = true;
			}
			else {
				showDebug(nounToString(newSubNoun));
			}

			decreaseIndent();

			noun = left.concat(newSubNoun, right);
			continue;
		}

		var newNoun = addBrackets(noun);


		if (!nounsAreTheSame(noun, newNoun)) {
			showDebug("6  ::    [a b c]          [a [b c]]");
			showDebug(nounToString(newNoun));
			noun = newNoun;
			continue;
		}

		var op = noun[0];

		if (!isOperator(op)) 
			return noun;
		else
			noun.shift();

		if (op == "?") {
			newNoun = _wut(noun);
		}
		else if (op == "+") {
			newNoun = _lus(noun);
		}
		else if (op == "=") {
			newNoun = _tis(noun);
		}
		else if (op == "/") {
			newNoun = _fas(noun);
		}
		else if (op == "*") {
			newNoun = _tar(noun);
		}

		if (nounsAreTheSame(noun, newNoun)) {
			showDebug("CRASH!");
			noun.unshift(op);
			done = true;
		}
		else {
			noun = newNoun;
			if (!isOperator(noun[0])) 
				done = true;
		}

		showDebug(nounToString(noun));

		//done = true;

	}

	showDebug("===");

	return noun;
}

function readFromTokens(tokens) {
	/*
	 * Take the token array and generate a function
	 */
	
	var token = tokens.shift();
	token = token + "";

	// If it's an operator, return the appropriate operator function, and 
	// recursively call this function to get the parameters
	if (isOperator(token)) {
		var params = readFromTokens(tokens);
		if (token == "?") {
			return function() {
				return wut(params, wut);
			}
		}
		else if (token == "+") {
			return function() {
				return lus(params);
			}
		}
		else if (token == "=") {
			return function() {
				return tis(params);
			}
		}
		else if (token == "/") {
			return function() {
				return fas(params);
			}
		}
		else if (token == "*") {
			return function() {
				return tar(params);
			}
		}
	}
	else if (isAtom(token)) {
		return token;
	}
	if (token == "[") {
		var array = [];
		while (tokens[0] != "]")  {
			array.push(readFromTokens(tokens));
		}
		tokens.shift();
		return array;
	}
	else if (token == "]") {
		throw Error("Unmatched ]");
	}
	else {
		
		// If we're still here, we got something weird
		throw Error("Unexpected input: " + token);
	}
}


function formatList(result) {
	/*
	 * Take the JavaScript return value and format it to look like nock
	 */


	// The return value should be either an atom or an array.  Or a string in a
	// crash condition.  The array could be an array of arrays.  
	if (wut(result) == NO)
		return result + "";

	var returnVal = "["
	for (var i = 0; i < result.length; i++) {
		if (i != 0) {
			returnVal += " ";
		}

		if (wut(result[i]) == YES)
			returnVal += formatList(result[i]);
		else 
			returnVal += result[i]
	}		
	returnVal += "]";

	return returnVal;
}

// Exports for node.js
//
exports.NOCK_VERSION = NOCK_VERSION;
exports.NOCKJS_VERSION = NOCKJS_VERSION;

exports.evalNock = function(command) {
	return evalNock(command);
}

exports.formatList = function(list) {
	return formatList(list);
}

exports.setDebugging = function(debugging) {
	DEBUG = debugging;
}
	
	
