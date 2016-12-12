window.onload = function() {
	const video = document.createElement('video');
	document.body.appendChild(video);

	video.src = '../../assets/sintel.webm';
	video.playbackRate = 0.5;
	video.addEventListener('loadedmetadata', function(e) {
		console.log('initial video duration', video.duration);
	});

	const videoStream = video.mozCaptureStream();
	const recorder = new MediaRecorder(videoStream);

	recorder.addEventListener('dataavailable', function(e) {
		const video2 = document.createElement('video');
		video2.src = URL.createObjectURL(e.data);
		video2.controls = true;
		document.body.appendChild(video2);

		video2.addEventListener('loadedmetadata', function(e) {
			console.log('*new* video duration', video2.duration);
		});

		video2.play();
	});

	video.addEventListener('ended', function(e) {
		console.log('ended video');
	});

	recorder.start();
	video.play();

};
