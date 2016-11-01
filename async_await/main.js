window.addEventListener('DOMContentLoaded', main);

async function main() {
	var greeting = await unpredictableHello();
	console.log(greeting, 'you!');
	var answerElement = document.getElementById('answer');
	answerElement.innerHTML = 'YES!';
}

async function unpredictableHello() {
	return new Promise((fulfill) => {
		setTimeout(() => {
			fulfill('hello');
		}, Math.random() * 100);
	});
}

