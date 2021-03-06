//  ROUTER-to-REQ example

var cluster = require('cluster')
  , zmq     = require('zmq');

const workerCount = 10
    , howLong     = 5000; //milliseconds

function rand(upper, extra) {
    var num = Math.abs(Math.round(Math.random() * upper));
    return num + (extra || 0);
};

if (cluster.isMaster) { //Parent thread
  
    var workersOnline = 0;
    var stopExecution = false;

    broker = zmq.socket('router');

    broker.on('message', function() {
        var msg = [];
        Array.prototype.slice.call(arguments).forEach(function(arg) {
            msg.push(arg.toString());
        });

        broker.send([msg[0],'',(stopExecution ? 'Fired!' : 'Work Harder') ])
    });

    broker.bind('tcp://*:5671');

    // Listen for workers to come online.
    cluster.on('online', function(worker) {
        console.log('+ Worker ' + worker.process.pid + ' is online.');
        workersOnline++;
    });

    // Listen for workers that were killed.
    cluster.on('exit', function(worker) {
        workersOnline--;
        if (workersOnline == 0) {
            broker.close();
            process.exit(0);
        }
    });

    // Fork worker processes.
    for (var i = 0; i < workerCount; i++) {
      var c = cluster.fork();
    }

    setTimeout(function() {
      stopExecution = true;
    },howLong);

} else { //Worker thread
  
    var i = 0; //number of task executions

    // Worker process - create REQ socket
    var reqWorker = zmq.socket('req');
    reqWorker.identity = process.pid.toString();
  
    // Perform work as it comes in.
    reqWorker.on('message', function(msg) {
    
        if (msg == 'Fired!') { //finish worker thread

            reqWorker.close();
            cluster.worker.kill();
            console.log('- Worker ' + process.pid + ' executed ' + i + ' tasks');
        }
        else { 

            i++;

            setTimeout(function() {
                reqWorker.send('Hi Boss');            
            }, rand(500,1)); //sleeps for a while and asks for more work
        }

    });

    reqWorker.connect('tcp://localhost:5671');

    //Sends first message after a quick nap 
    setTimeout( function() {
        reqWorker.send('Hi Boss');
    },1);
};