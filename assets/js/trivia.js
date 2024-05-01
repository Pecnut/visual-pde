var a = {
    37: 'left',
    38: 'up',
    39: 'right',
    40: 'down',
    65: 'a',
    66: 'b'
    };
    var b = [a[38], a[38], a[40], a[40], a[37], a[39], a[37], a[39], a[66],a[65]];
    
    var c = 0;
    
    document.addEventListener('keydown', function(e) {
    var d = a[e.keyCode];
    var E = b[c];
    
    if (d == E) {
    
    c++;
    
    if (c == b.length) {
    H();
    c = 0;
    }
    } else {
    c = 0;
    }
    });
    
    function H(){
    window.location.href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    }