var     cluster = require('cluster')
      , zmq     = require('zmq');

const workerCount = 30;

function rand(upper, extra) {
  var num = Math.abs(Math.round(Math.random() * upper));
  return num + (extra || 0);
};

if (cluster.isMaster) {
  
    var workers = workerCount;

  // Listen for workers to come online.
  cluster.on('online', function(worker) {
    console.log('+ Worker ' + worker.process.pid + ' is online.');
  });

  // Listen for workers to come online.
  cluster.on('exit', function(worker) {
    workers--;

    if (workers == 0) process.exit(0);
  });

  broker = zmq.socket('router');
  broker.bind('tcp://*:5671');

  broker.on('message', function() {
    var msg = [];
    Array.prototype.slice.call(arguments).forEach(function(arg) {
        msg.push(arg.toString());
    });

    //console.log('> broker received ' + msg);

    if (rand(100) > 95)
        broker.send([msg[0],'','Fired!'])
    else
        broker.send([msg[0],'','Work Harder'])
  
  })

  // Fork worker processes.
  for (var i = 0; i < workerCount; i++) {
    var c = cluster.fork();
  }

} else {
  
  var i = 0; //number of executions

  // Worker process - create REQ socket
  var worker = zmq.socket('req');
  worker.identity = process.pid.toString();
  
  // Perform work as it comes in.
  worker.on('message', function(msg) {
    
    //console.log('> worker ' + process.pid + ' received ' + msg);

    if (msg == 'Fired!') {
        
        cluster.worker.kill();
        console.log('- Worker ' + process.pid + ' executed ' + i + ' times');
    }
    else {
        
        i++;
        //console.log(': Job ' + msg +' (' + process.pid + ')');

        setTimeout(function() {
            //console.log('< worker ' + process.pid.toString() + ' sending Hi Boss');
            worker.send('Hi Boss');            
        }, rand(500,1));
    }

  });

  worker.connect('tcp://localhost:5671');

  //console.log('< worker ' + process.pid.toString() + ' sending Hi Boss');
  worker.send('Hi Boss');

}