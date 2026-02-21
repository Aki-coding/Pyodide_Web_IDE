javascript: (function () {
	const IDE_URL = 'https://aki-coding.github.io/Pyodide_Web_IDE/prod/IDE/Pyodide_IDE.html';
	const CHECK_INTERVAL = 1000;
	let state = 'UNKNOWN';
	let ideWindow = null;
	let lastResponseLen = 0;

	function getSubmitButton() {
		const btn = document.querySelector('[aria-label=&quot;プロンプトを送信&quot;]');
		return (btn && btn.offsetParent !== null) ? btn : null;
	}

	function getInputArea() {
		return document.querySelector('.ProseMirror') || 
			document.querySelector('[contenteditable=&quot;true&quot;]') || 
			document.querySelector('rich-textarea > div > p') ||
			document.querySelector('textarea'); 
	}

	function sendToIDE(text) {
		if(ideWindow) {
			ideWindow.postMessage({ type: 'GEMINI_RESPONSE', text: text }, '*'); 
			console.log('Gemini Bridge: Sent to IDE');
		}
	}

	function submitToGemini(text) {
		const input = getInputArea();
		const btn = getSubmitButton();
		if(input && btn) {
			console.log('Gemini Bridge: Auto-submitting...');
			input.focus();
			input.textContent = text; 
			input.dispatchEvent(new Event('input', { bubbles: true }));
			setTimeout(() => {
				const updatedBtn = getSubmitButton();
				if(updatedBtn) {
					updatedBtn.click();
					console.log('Gemini Bridge: Clicked submit');
					state = 'GENERATING';
				}
			}, 500);
		} else {
			console.error('Gemini Bridge: Input or Button not found');
			alert('自動送信エラー: 入力欄または送信ボタンが見つかりません');
		}
	}

	function checkResponse() {
		const responses = document.querySelectorAll('model-response');
		if(responses.length > 0) {
			const lastResponse = responses[responses.length - 1];
			const text = lastResponse.innerText;
			if (text.length !== lastResponseLen) {
				sendToIDE(text);
				lastResponseLen = text.length;
			}
		}
	}

	console.log('Gemini-IDE Bridge: Initializing...');
	ideWindow = window.open(IDE_URL, 'gemini_ide_window');

	window.addEventListener('message', (event) => {
		const data = event.data;
		console.log('Gemini Bridge: Received message', data);

		if(data && data.cmd === 'script_result') {
			const resultText = 'cmd: script_result,\n' + data.result;
			submitToGemini(resultText);
		} else if (data && data.cmd === 'user_prompt') {
			submitToGemini(data.text);
		} else if (data && data.cmd === 'goal_achieved') {
			alert('目的達成: ' + data.message);
		} else if (data && data.cmd === 'user_verification') {
			alert('ユーザー検証: ' + data.message);
		}
	});

	const btn = getSubmitButton();
	state = btn ? 'WAITING_FOR_SUBMIT' : 'GENERATING';
	console.log('Gemini Bridge: Initial state = ' + state);

	setInterval(() => {
		const currentBtn = getSubmitButton();
		if(state === 'WAITING_FOR_SUBMIT') {
			if(!currentBtn) {
				state = 'GENERATING';
				console.log('Gemini Bridge: Generating...');
				lastResponseLen = 0;
			}
		} else if(state === 'GENERATING') {
			if(currentBtn) {
				state = 'COMPLETE';
				console.log('Gemini Bridge: Complete');
				setTimeout(() => {
					checkResponse();
					state = 'WAITING_FOR_SUBMIT';
				}, 1000);
			}
		}
	}, CHECK_INTERVAL);

	alert('Gemini-IDE Bridge Loaded');

})();
