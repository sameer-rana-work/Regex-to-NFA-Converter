import tkinter as tk
from tkinter import messagebox, ttk
from PIL import Image, ImageTk
from graphviz import Digraph
import json
import re

# State and NFA Classes
class State:
    def __init__(self):
        self.transitions = {}
        self.epsilon = set()

class NFA:
    def __init__(self, start, accept):
        self.start = start
        self.accept = accept

# Regex Validation
def validate_regex(regex):
    try:
        stack = []
        for char in regex:
            if char == '(':
                stack.append(char)
            elif char == ')':
                if not stack:
                    return False, "Unbalanced parentheses: too many closing parentheses"
                stack.pop()
        if stack:
            return False, "Unbalanced parentheses: unclosed parentheses"
        valid_chars = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789|*+?().')
        if not all(c in valid_chars for c in regex):
            return False, "Invalid characters in regex"
        if not regex:
            return False, "Regex cannot be empty"
        return True, ""
    except Exception as e:
        return False, f"Validation error: {e}"

# Infix to Postfix conversion
def insert_concat(regex):
    output = ""
    ops = {'*', '+', '?', '|', '(', ')'}
    for i in range(len(regex)):
        output += regex[i]
        if i + 1 < len(regex):
            if (regex[i] not in ops or regex[i] == ')') and (regex[i+1] not in ops or regex[i+1] == '('):
                output += '.'
    return output

def infix_to_postfix(regex):
    precedence = {'*': 3, '+': 3, '?': 3, '.': 2, '|': 1}
    output, stack = [], []
    for char in regex:
        if char.isalnum():
            output.append(char)
        elif char == '(':
            stack.append(char)
        elif char == ')':
            while stack and stack[-1] != '(':
                output.append(stack.pop())
            stack.pop()
        else:
            while stack and stack[-1] != '(' and precedence.get(char, 0) <= precedence.get(stack[-1], 0):
                output.append(stack.pop())
            stack.append(char)
    while stack:
        output.append(stack.pop())
    return ''.join(output)

# Thompson's Construction
def regex_to_nfa(postfix):
    stack = []

    def basic(symbol):
        s, a = State(), State()
        s.transitions[symbol] = {a}
        return NFA(s, a)

    for c in postfix:
        if c == '*':
            nfa = stack.pop()
            s, a = State(), State()
            s.epsilon.update([nfa.start, a])
            nfa.accept.epsilon.update([nfa.start, a])
            stack.append(NFA(s, a))
        elif c == '+':
            nfa = stack.pop()
            s, a = State(), State()
            s.epsilon.add(nfa.start)
            nfa.accept.epsilon.update([nfa.start, a])
            stack.append(NFA(s, a))
        elif c == '?':
            nfa = stack.pop()
            s, a = State(), State()
            s.epsilon.update([nfa.start, a])
            nfa.accept.epsilon.add(a)
            stack.append(NFA(s, a))
        elif c == '|':
            n2, n1 = stack.pop(), stack.pop()
            s, a = State(), State()
            s.epsilon.update([n1.start, n2.start])
            n1.accept.epsilon.add(a)
            n2.accept.epsilon.add(a)
            stack.append(NFA(s, a))
        elif c == '.':
            n2, n1 = stack.pop(), stack.pop()
            n1.accept.epsilon.add(n2.start)
            stack.append(NFA(n1.start, n2.accept))
        else:
            stack.append(basic(c))
    return stack.pop()

# NFA Simulation
def simulate_nfa(nfa, input_string):
    def epsilon_closure(states):
        closure = set(states)
        stack = list(states)
        while stack:
            state = stack.pop()
            for next_state in state.epsilon:
                if next_state not in closure:
                    closure.add(next_state)
                    stack.append(next_state)
        return closure

    current_states = epsilon_closure({nfa.start})
    for symbol in input_string:
        next_states = set()
        for state in current_states:
            if symbol in state.transitions:
                next_states.update(state.transitions[symbol])
        current_states = epsilon_closure(next_states)
    return nfa.accept in current_states

# Display Transitions as Text
def get_transitions(nfa):
    visited = set()
    ids = {}
    counter = [0]
    result = []

    def visit(state):
        if state not in visited:
            visited.add(state)
            ids[state] = f"S{counter[0]}"
            counter[0] += 1
            for sym, tgt in state.transitions.items():
                for t in tgt: visit(t)
            for t in state.epsilon: visit(t)

    visit(nfa.start)

    for state in visited:
        sid = ids[state]
        for sym, tgt in state.transitions.items():
            for t in tgt:
                result.append(f"{sid} -- {sym} --> {ids[t]}")
        for t in state.epsilon:
            result.append(f"{sid} -- ε --> {ids[t]}")
    result.append(f"\nStart: {ids[nfa.start]}")
    result.append(f"Accept: {ids[nfa.accept]}")
    return '\n'.join(result), ids

# Generate Graph Image
def draw_nfa(nfa):
    dot = Digraph()
    visited = set()
    ids = {}
    count = [0]

    def get_id(state):
        if state not in ids:
            ids[state] = f"S{count[0]}"
            count[0] += 1
        return ids[state]

    def dfs(state):
        sid = get_id(state)
        if state in visited: return
        visited.add(state)
        dot.node(sid, shape="doublecircle" if state == nfa.accept else "circle")
        for sym, tgt in state.transitions.items():
            for t in tgt:
                tid = get_id(t)
                dot.edge(sid, tid, label=sym)
                dfs(t)
        for t in state.epsilon:
            tid = get_id(t)
            dot.edge(sid, tid, label='ε')
            dfs(t)

    dfs(nfa.start)
    dot.attr(rankdir='LR')
    dot.render('nfa_output', format='png', cleanup=True)

# Save NFA
def save_nfa(nfa, postfix):
    transitions, ids = get_transitions(nfa)
    data = {
        'postfix': postfix,
        'transitions': transitions,
        'start': ids[nfa.start],
        'accept': ids[nfa.accept]
    }
    with open('nfa_data.json', 'w') as f:
        json.dump(data, f)
    import shutil
    shutil.copy('nfa_output.png', 'nfa_diagram.png')
    messagebox.showinfo("Success", "NFA saved successfully")

# Load NFA
def load_nfa():
    try:
        with open('nfa_data.json', 'r') as f:
            data = json.load(f)
        output_text.delete("1.0", tk.END)
        output_text.insert(tk.END, f"Postfix: {data['postfix']}\n\nTransitions:\n{data['transitions']}")
        
        image = Image.open("nfa_diagram.png")
        image = image.resize((500, 300), Image.Resampling.LANCZOS)
        photo = ImageTk.PhotoImage(image)
        
        canvas.image = photo
        canvas.create_image(0, 0, anchor=tk.NW, image=photo)
        
        messagebox.showinfo("Success", "NFA loaded successfully")
    except Exception as e:
        messagebox.showerror("Error", f"Failed to load NFA: {e}")

# GUI Functions
def process_regex():
    regex = entry.get()
    is_valid, error_msg = validate_regex(regex)
    if not is_valid:
        messagebox.showerror("Error", error_msg)
        return
    
    try:
        regex_concat = insert_concat(regex)
        postfix = infix_to_postfix(regex_concat)
        nfa = regex_to_nfa(postfix)
        transitions, _ = get_transitions(nfa)
        draw_nfa(nfa)

        output_text.delete("1.0", tk.END)
        output_text.insert(tk.END, f"Postfix: {postfix}\n\nTransitions:\n{transitions}")

        image = Image.open("nfa_output.png")
        image = image.resize((500, 300), Image.Resampling.LANCZOS)
        photo = ImageTk.PhotoImage(image)

        canvas.image = photo
        canvas.create_image(0, 0, anchor=tk.NW, image=photo)

        process_regex.nfa = nfa
        process_regex.postfix = postfix

    except Exception as e:
        messagebox.showerror("Error", f"Invalid regex: {e}")

def simulate_string():
    if not hasattr(process_regex, 'nfa'):
        messagebox.showerror("Error", "No NFA available. Process a regex first.")
        return
    
    input_string = simulate_entry.get()
    if not input_string:
        messagebox.showerror("Error", "Please enter a test string.")
        return
    
    result = simulate_nfa(process_regex.nfa, input_string)
    messagebox.showinfo("Simulation Result", f"String '{input_string}' is {'accepted' if result else 'rejected'} by the NFA.")

def run_test_suite():
    if not hasattr(process_regex, 'nfa'):
        messagebox.showerror("Error", "No NFA available. Process a regex first.")
        return
    
    test_strings = test_entry.get("1.0", tk.END).strip().split('\n')
    if not test_strings or test_strings == ['']:
        messagebox.showerror("Error", "Please enter at least one test string.")
        return
    
    for item in test_tree.get_children():
        test_tree.delete(item)
    
    for string in test_strings:
        if string.strip():
            result = simulate_nfa(process_regex.nfa, string.strip())
            test_tree.insert('', 'end', values=(string.strip(), 'Accepted' if result else 'Rejected'))

# GUI Layout with Scrollbar
root = tk.Tk()
root.title("Enhanced Regex to NFA Converter")
root.geometry("800x600")

# Create a canvas and scrollbar
main_frame = tk.Frame(root)
main_frame.pack(fill=tk.BOTH, expand=1)

canvas = tk.Canvas(main_frame)
scrollbar = tk.Scrollbar(main_frame, orient=tk.VERTICAL, command=canvas.yview)
scrollable_frame = tk.Frame(canvas)

scrollable_frame.bind(
    "<Configure>",
    lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
)

canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
canvas.configure(yscrollcommand=scrollbar.set)

canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=1)
scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

# Regex Input
tk.Label(scrollable_frame, text="Enter Regex:").pack()
entry = tk.Entry(scrollable_frame, width=40)
entry.pack(pady=5)

# Buttons
button_frame = tk.Frame(scrollable_frame)
button_frame.pack(pady=10)
tk.Button(button_frame, text="Convert", command=process_regex).pack(side=tk.LEFT, padx=5)
tk.Button(button_frame, text="Save NFA", command=lambda: save_nfa(process_regex.nfa, process_regex.postfix) if hasattr(process_regex, 'nfa') else messagebox.showerror("Error", "No NFA to save")).pack(side=tk.LEFT, padx=5)
tk.Button(button_frame, text="Load NFA", command=load_nfa).pack(side=tk.LEFT, padx=5)

# Output Text
output_text = tk.Text(scrollable_frame, height=15, width=80)
output_text.pack(pady=10)

# NFA Diagram
canvas = tk.Canvas(scrollable_frame, width=500, height=300)
canvas.pack()

# Simulation Input
tk.Label(scrollable_frame, text="Test String for Simulation:").pack()
simulate_entry = tk.Entry(scrollable_frame, width=40)
simulate_entry.pack(pady=5)
tk.Button(scrollable_frame, text="Simulate", command=simulate_string).pack(pady=5)

# Test Suite
tk.Label(scrollable_frame, text="Test Suite (one string per line):").pack()
test_entry = tk.Text(scrollable_frame, height=5, width=40)
test_entry.pack(pady=5)
tk.Button(scrollable_frame, text="Run Tests", command=run_test_suite).pack(pady=5)

# Test Results Table
test_tree = ttk.Treeview(scrollable_frame, columns=('String', 'Result'), show='headings')
test_tree.heading('String', text='Test String')
test_tree.heading('Result', text='Result')
test_tree.pack(pady=10)

root.mainloop()