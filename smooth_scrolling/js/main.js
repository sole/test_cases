(function() {
	var h1 = document.querySelector('h1');
	h1.textContent = document.title;

	var loremIpsum = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum";

	var randomContainer = document.getElementById('random_stuff');
	var maxHeight = 2000;
	var maxWidth = 2000;
	var colours = [ '#69D2E7', '#A7DBD8', '#E0E4CC', '#F38630', '#FA6900' ];

	for(var i = 0; i < 100; i++) {
		var div = document.createElement('div');
		div.innerHTML = loremIpsum;
		div.style.top = rand(maxHeight) + 'px';
		div.style.left = rand(maxHeight) + 'px';
		div.style.width = (200 + rand(400)) + 'px';
		div.style.backgroundColor = randomColour();
		randomContainer.appendChild(div);
	}

	document.getElementById('normal').addEventListener('click', function() {
		randomScroll(false);
	});

	document.getElementById('smooth').addEventListener('click', function() {
		randomScroll(true);
	});
	//
	
	function rand(v) {
		return ( Math.random() * v ) | 0;
	}


	function randomColour() {
		//return rand(0xFFFFFF).toString(16);
		return colours[ rand( colours.length ) ].toString(16);
	}

	function randomScroll(smooth) {
		var x = rand(maxWidth) - rand(maxWidth);
		var y = rand(maxHeight) - rand(maxHeight);
		var behavior = smooth ? 'smooth' : 'auto';
		window.scrollBy({ behavior: behavior, top: y, left: x });
	}

}).call(this);

