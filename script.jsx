const { useState, useEffect } = React;

const App = () => {
    const [regex, setRegex] = useState('');
    const [postfix, setPostfix] = useState('');
    const [transitions, setTransitions] = useState('');
    const [diagramSvg, setDiagramSvg] = useState(null);
    const [nfa, setNfa] = useState(null);
    const [simulateString, setSimulateString] = useState('');
    const [simulateResult, setSimulateResult] = useState('');
    const [testStrings, setTestStrings] = useState('');
    const [testResults, setTestResults] = useState([]);

    const processRegex = async () => {
        const [isValid, errorMsg] = validateRegex(regex);
        if (!isValid) {
            alert(errorMsg);
            return;
        }

        try {
            const regexConcat = insertConcat(regex);
            const postfixExpr = infixToPostfix(regexConcat);
            const nfaResult = regexToNFA(postfixExpr);
            const [trans, _] = getTransitions(nfaResult);
            const svg = await drawNFA(nfaResult);

            setPostfix(postfixExpr);
            setTransitions(trans);
            setDiagramSvg(svg);
            setNfa(nfaResult);
            setSimulateResult('');
            setTestResults([]);
        } catch (e) {
            alert(`Invalid regex: ${e}`);
        }
    };

    const simulate = () => {
        if (!nfa) {
            alert("No NFA available. Process a regex first.");
            return;
        }
        if (!simulateString) {
            alert("Please enter a test string.");
            return;
        }
        const result = simulateNFA(nfa, simulateString);
        setSimulateResult(`String '${simulateString}' is ${result ? 'accepted' : 'rejected'} by the NFA.`);
    };

    const runTestSuite = () => {
        if (!nfa) {
            alert("No NFA available. Process a regex first.");
            return;
        }
        const strings = testStrings.split('\n').map(s => s.trim()).filter(s => s);
        if (!strings.length) {
            alert("Please enter at least one test string.");
            return;
        }
        const results = strings.map(str => ({
            string: str,
            result: simulateNFA(nfa, str) ? 'Accepted' : 'Rejected'
        }));
        setTestResults(results);
    };

    const save = () => {
        if (!nfa || !diagramSvg) {
            alert("No NFA to save.");
            return;
        }
        saveNFA(postfix, transitions, diagramSvg);
    };

    const load = () => {
        loadNFA((data) => {
            setPostfix(data.postfix);
            setTransitions(data.transitions);
            const svgElement = document.createElement('div');
            svgElement.innerHTML = data.diagram;
            setDiagramSvg(svgElement.firstChild);
            setRegex('');
            setSimulateResult('');
            setTestResults([]);
            // Recompute NFA for simulation
            const regexConcat = insertConcat(regex || data.postfix.replace(/[.+*?|]/g, '')); // Simplified
            const postfixExpr = infixToPostfix(regexConcat);
            const nfaResult = regexToNFA(postfixExpr);
            setNfa(nfaResult);
        });
    };

    return (
        <div className="container mx-auto p-4 bg-white rounded shadow">
            <h1 className="text-2xl font-bold mb-4">Enhanced Regex to NFA Converter</h1>

            <div className="mb-4">
                <label className="block mb-1">Enter Regex:</label>
                <input
                    type="text"
                    value={regex}
                    onChange={(e) => setRegex(e.target.value)}
                    className="border p-2 rounded"
                    placeholder="e.g., a+b"
                />
                </div>

            <div className="mb-4 flex space-x-2">
                <button onClick={processRegex} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Convert</button>
                <button onClick={save} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">Save NFA</button>
                <button onClick={load} className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600">Load NFA</button>
            </div>

            {postfix && (
                <div className="mb-4">
                    <h2 className="text-lg font-semibold">Postfix:</h2>
                    <pre className="bg-gray-100 p-2 rounded">{postfix}</pre>
                </div>
            )}

            {transitions && (
                <div className="mb-4">
                    <h2 className="text-lg font-semibold">Transitions:</h2>
                    <pre className="bg-gray-100 p-2 rounded">{transitions}</pre>
                </div>
            )}

            {diagramSvg && (
                <div className="mb-4">
                    <h2 className="text-lg font-semibold">NFA Diagram:</h2>
                    <div id="nfa-diagram" dangerouslySetInnerHTML={{ __html: diagramSvg.outerHTML }}></div>
                </div>
            )}

            <div className="mb-4">
                <label className="block mb-1">Test String for Simulation:</label>
                <input
                    type="text"
                    value={simulateString}
                    onChange={(e) => setSimulateString(e.target.value)}
                    className="border p-2 rounded mb-2"
                    placeholder="e.g., aab"
                />
                <button onClick={simulate} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Simulate</button>
                {simulateResult && <p className="mt-2">{simulateResult}</p>}
            </div>

            <div className="mb-4">
                <label className="block mb-1">Test Suite (one string per line):</label>
                <textarea
                    value={testStrings}
                    onChange={(e) => setTestStrings(e.target.value)}
                    className="border p-2 rounded"
                    rows="5"
                    placeholder="e.g., ab\naab\nb"
                ></textarea>
                <button onClick={runTestSuite} className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Run Tests</button>
            </div>

            {testResults.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold">Test Results:</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Test String</th>
                                <th>Result</th>
                            </tr>
                        </thead>
                        <tbody>
                            {testResults.map((result, index) => (
                                <tr key={index}>
                                    <td>{result.string}</td>
                                    <td>{result.result}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

ReactDOM.render(<App />, document.getElementById('root'));