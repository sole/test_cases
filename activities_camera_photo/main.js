window.onload = function() {
    
    if( !window.MozActivity ) {
        alert('This environment does not support Web Activities.\nSorry about that :-(\nMaybe try it on Firefox OS?');
        return;
    }

    var pictures = document.getElementById('pictures');
    var button = document.querySelector('input[type=button]');

    button.addEventListener('click', launchActivity, false);

    function launchActivity() {

        var activity = new MozActivity({
            name: 'record',
            data: {
                type: [ 'photos' ]
            }
        });

        activity.onsuccess = function() {
            var picture = this.result;
            console.log('got a picture');
            console.log(picture);
        };

        activity.onerror = function() {
            console.log(this.error);
            console.log('got an error');
        };

    }

};

