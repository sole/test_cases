window.addEventListener('DOMContentLoaded', function() {

	var request = new XMLHttpRequest();
    request.open('get', 'tests.json', true);
    request.responseType = 'json';
	request.addEventListener('load', onTestsLoaded);
	request.addEventListener('error', onTestsLoadError);
	request.send();

	function onTestsLoaded(e) {
		var response = this.response;
		
		if(!response || !(response.tests)) {
			onTestsLoadError(new Error('No tests found'));
			return;
		}

		var list = document.createElement('dl');
		document.body.appendChild(list);

		response.tests.forEach(function(test) {
			var title = test[0];
			var desc = test[1];
			var term = document.createElement('dt');
			var link = document.createElement('a');
			link.href = title;
			link.textContent = title;
			term.appendChild(link);
			var termDescription = document.createElement('dd');
			termDescription.textContent = desc;
			list.appendChild(term);
			list.appendChild(termDescription);
		});
	
	}

	function onTestsLoadError(e) {
	}

});
