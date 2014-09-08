window.addEventListener('load', function() {
  
  var video = document.querySelector('video');
  var context = new AudioContext();
  var gain = context.createGain();
  var mediaElement = context.createMediaElementSource(video);

  mediaElement.connect(gain);
  gain.connect(context.destination);
  
  


});
