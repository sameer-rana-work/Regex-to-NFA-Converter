// State and NFA Classes
class State {
    constructor() {
        this.transitions = {};
        this.epsilon = new Set();
    }
}

class NFA {
    constructor(start, accept) {
        this.start = start;
        this.accept = accept;
    }
}

// Regex Validation
function validateRegex(regex) {
    try {
        let stack = [];
        for (let char of regex) {
            if (char === '(') stack.push(char);
            else if (char === ')') {
                if (!stack.length) return [false, "Unbalanced parentheses: too many closing parentheses"];
                stack.pop();
            }
        }
        if (stack.length) return [false, "Unbalanced parentheses: unclosed parentheses"];
        const validChars = new Set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789|*+?().');
        if (![...regex].every(c => validChars.has(c))) return [false, "Invalid characters in regex"];
        if (!regex) return [false, "Regex cannot be empty"];
        return [true, ""];
    } catch (e) {
        return [false, `Validation error: ${e}`];
    }
}

// Infix to Postfix Conversion
function insertConcat(regex) {
    let output = "";
    const ops = new Set(['*', '+', '?', '|', '(', ')']);
    for (let i = 0; i < regex.length; i++) {
        // Handle repeating operators by wrapping the previous symbol/group
        if (i + 1 < regex.length && ['*', '+', '?'].includes(regex[i + 1])) {
            if (regex[i] === ')') {
                // Find matching opening parenthesis
                let j = i, count = 1;
                while (j > 0 && count > 0) {
                    j--;
                    if (regex[j] === ')') count++;
                    if (regex[j] === '(') count--;
                }
                output = output + '(' + regex.substring(j, i + 1) + ')' + regex[i + 1];
            } else if (!ops.has(regex[i])) {
                output = output + '(' + regex[i] + ')' + regex[i + 1];
            } else {
                output += regex[i];
                continue;
            }
            i++; // Skip the operator
        } else {
            output += regex[i];
        }
        // Insert concatenation operator
        if (i + 1 < regex.length) {
            if ((!ops.has(regex[i]) || regex[i] === ')') && (!ops.has(regex[i + 1]) || regex[i + 1] === '(')) {
                output += '.';
            }
        }
    }
    return output;
}

function infixToPostfix(regex) {
    const precedence = { '*': 3, '+': 3, '?': 3, '.': 2, '|': 1 };
    let output = [], stack = [];
    for (let char of regex) {
        if (/[a-zA-Z0-9]/.test(char)) {
            output.push(char);
        } else if (char === '(') {
            stack.push(char);
        } else if (char === ')') {
            while (stack.length && stack[stack.length - 1] !== '(') {
                output.push(stack.pop());
            }
            stack.pop();
        } else {
            while (stack.length && stack[stack.length - 1] !== '(' && precedence[char] <= precedence[stack[stack.length - 1]]) {
                output.push(stack.pop());
            }
            stack.push(char);
        }
    }
    while (stack.length) output.push(stack.pop());
    return output.join('');
}

// Thompson's Construction
function regexToNFA(postfix) {
    let stack = [];

    function basic(symbol) {
        const s = new State(), a = new State();
        s.transitions[symbol] = new Set([a]);
        return new NFA(s, a);
    }

    for (let c of postfix) {
        if (c === '*') {
            const nfa = stack.pop();
            const s = new State(), a = new State();
            s.epsilon.add(nfa.start);
            s.epsilon.add(a);
            nfa.accept.epsilon.add(nfa.start);
            nfa.accept.epsilon.add(a);
            stack.push(new NFA(s, a));
        } else if (c === '+') {
            const nfa = stack.pop();
            const s = new State(), a = new State();
            s.epsilon.add(nfa.start);
            nfa.accept.epsilon.add(nfa.start);
            nfa.accept.epsilon.add(a);
            stack.push(new NFA(s, a));
        } else if (c === '?') {
            const nfa = stack.pop();
            const s = new State(), a = new State();
            s.epsilon.add(nfa.start);
            s.epsilon.add(a);
            nfa.accept.epsilon.add(a);
            stack.push(new NFA(s, a));
        } else if (c === '|') {
            const n2 = stack.pop(), n1 = stack.pop();
            const s = new State(), a = new State();
            s.epsilon.add(n1.start);
            s.epsilon.add(n2.start);
            n1.accept.epsilon.add(a);
            n2.accept.epsilon.add(a);
            stack.push(new NFA(s, a));
        } else if (c === '.') {
            const n2 = stack.pop(), n1 = stack.pop();
            n1.accept.epsilon.add(n2.start);
            stack.push(new NFA(n1.start, n2.accept));
        } else {
            stack.push(basic(c));
        }
    }
    return stack.pop();
}

// NFA Simulation
function simulateNFA(nfa, inputString) {
    function epsilonClosure(states) {
        const closure = new Set(states);
        const stack = [...states];
        while (stack.length) {
            const state = stack.pop();
            for (let nextState of state.epsilon) {
                if (!closure.has(nextState)) {
                    closure.add(nextState);
                    stack.push(nextState);
                }
            }
        }
        return closure;
    }

    let currentStates = epsilonClosure(new Set([nfa.start]));
    for (let symbol of inputString) {
        let nextStates = new Set();
        for (let state of currentStates) {
            if (state.transitions[symbol]) {
                for (let t of state.transitions[symbol]) {
                    nextStates.add(t);
                }
            }
        }
        currentStates = epsilonClosure(nextStates);
    }
    return currentStates.has(nfa.accept);
}

// Display Transitions
function getTransitions(nfa) {
    const visited = new Set();
    const ids = new Map();
    let counter = 0;
    let result = [];

    function visit(state) {
        if (!visited.has(state)) {
            visited.add(state);
            ids.set(state, `S${counter++}`);
            for (let sym in state.transitions) {
                for (let t of state.transitions[sym]) visit(t);
            }
            for (let t of state.epsilon) visit(t);
        }
    }

    visit(nfa.start);

    for (let state of visited) {
        const sid = ids.get(state);
        for (let sym in state.transitions) {
            for (let t of state.transitions[sym]) {
                result.push(`${sid} -- ${sym} --> ${ids.get(t)}`);
            }
        }
        for (let t of state.epsilon) {
            result.push(`${sid} -- ε --> ${ids.get(t)}`);
        }
    }
    result.push(`\nStart: ${ids.get(nfa.start)}`);
    result.push(`Accept: ${ids.get(nfa.accept)}`);
    return [result.join('\n'), ids];
}

// Generate Graph (using Viz.js)
function drawNFA(nfa) {
    const dot = ["digraph G {"];
    dot.push('rankdir=LR;');
    const visited = new Set();
    const ids = new Map();
    let count = 0;

    function getId(state) {
        if (!ids.has(state)) {
            ids.set(state, `S${count++}`);
        }
        return ids.get(state);
    }

    function dfs(state) {
        const sid = getId(state);
        if (visited.has(state)) return;
        visited.add(state);
        dot.push(`${sid} [shape=${state === nfa.accept ? "doublecircle" : "circle"}];`);
        for (let sym in state.transitions) {
            for (let t of state.transitions[sym]) {
                const tid = getId(t);
                dot.push(`${sid} -> ${tid} [label="${sym}"];`);
                dfs(t);
            }
        }
        for (let t of state.epsilon) {
            const tid = getId(t);
            dot.push(`${sid} -> ${tid} [label="ε"];`);
            dfs(t);
        }
    }

    dfs(nfa.start);
    dot.push("}");
    const viz = new Viz();
    return viz.renderSVGElement(dot.join('\n'));
}

// Save NFA
function saveNFA(postfix, transitions, diagramSvg) {
    const data = {
        postfix: postfix,
        transitions: transitions,
        diagram: diagramSvg.outerHTML
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nfa_data.json';
    a.click();
    URL.revokeObjectURL(url);
}

// Load NFA
function loadNFA(callback) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            const data = JSON.parse(event.target.result);
            callback(data);
        };
        reader.readAsText(file);
    };
    input.click();
}