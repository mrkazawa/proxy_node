# Proxy Node #

This repository is the implementation of the agent node from our paper "", which is published [here]().
To run the proxy nodes, you also need to run all of core engines in the Notary Node, which is available [here](https://github.com/mrkazawa/notary_node).

## Setup ##

You need `vagrant` and `virtualbox` for this project.
So install them first if you do not have it yet in your machine.
You can download them [here](https://www.vagrantup.com/downloads.html) and [here](https://www.virtualbox.org/wiki/Downloads)
All of the required softwares and tools has been included in the `Vagrantfile` and it will be installed during the `vagrant up` using shell provisioning scripts in `./shell` directory.

## Installation ##

Run the following command:

```console
foo@ubuntu:~$ cd ~/
foo@ubuntu:~$ git clone https://github.com/mrkazawa/proxy_node.git
foo@ubuntu:~$ cd ~/proxy_node

foo@ubuntu:~$ vagrant up # if it is our first time, this will take some times
foo@ubuntu:~$ vagrant rsync-auto

foo@ubuntu:~$ cd ~/proxy_node # open new terminal for proxy1
foo@ubuntu:~$ cd vagrant ssh proxy1

foo@ubuntu:~$ cd ~/proxy_node # open new terminal for proxy2
foo@ubuntu:~$ cd vagrant ssh proxy2

foo@ubuntu:~$ cd ~/proxy_node # open new terminal for proxy3
foo@ubuntu:~$ cd vagrant ssh proxy3

foo@ubuntu:~$ cd ~/proxy_node # open new terminal for proxy4
foo@ubuntu:~$ cd vagrant ssh proxy4
```

Inside the SSH instances, we need to install all of the Node JS dependencies.
Run this in all proxy nodes (`proxy1` to `proxy4`).

```console
vagrant@proxy1:~$ cd ~/src
vagrant@proxy1:~$ npm install

vagrant@proxy1:~$ npm run-script # show all available NPM commands
```

Other useful commands, run outside of the SSH instances,

```console
foo@ubuntu:~$ cd ~/proxy_node
foo@ubuntu:~$ vagrant reload # to restart VM
foo@ubuntu:~$ vagrant halt # to shutdwon VM
foo@ubuntu:~$ vagrant destroy -f # to completely delete VM
```

- - - -

## Running The Proxies ##

The proxy will relay messages from IoT agents to the notary node.
Therefore, it depends on the notary node and it has to be run first.
[Here](https://github.com/mrkazawa/notary_node) is the guide to run the notary node.

Choose between one of these `proxy-default` or `proxy-priority`.

* `proxy-default` will run the proxy node wihout priority feature. All the requests from the IoT agents will be processed equally.
* `proxy-priority` will run the proxy node with priority feature. It will consider the priority tag in the IoT requests and processed them according to the priority.

There are three options for priority tag.

* `priority_id` equals to `1` means it is HIGH_PRIORITY messages, such as "cross-blockchain messages".
* `priority_id` equals to `2` means it is MEDIUM_PRIORITY messages, such as "security-related application messages".
* `priority_id` equals to `3` means it is LOW_PRIORITY messages, such as "other application messages".

Inside the Vagrant VM of the respective proxy, run the following.
Run this in all proxy nodes (`proxy1` to `proxy4`).

```console
vagrant@proxy1:~$ cd ~/src
vagrant@proxy1:~$ npm run proxy-default # without prority feature
vagrant@proxy1:~$ npm run proxy-priority # with priority feature
```

You can then start making request to the Proxy nodes by sending application data to these URLs.

```txt
http://proxy1.local:3001/relay_request
http://proxy2.local:3001/relay_request
http://proxy3.local:3001/relay_request
http://proxy4.local:3001/relay_request
```

- - - -

## Benchmarking The Core Engine With Priority ##

The purpose of this benchmarking is to see the behaviour of the proxy node in prioritizing IoT requests from agents according to their `priority_id` tag.
First, lets setup the Notay node.
The core engine in the notary node need to have the following configuration in their `./src/core/config.js`.

```js
// How long the period of block generation (in milliseconds)
this.BLOCK_INTERVAL = 1000; // every 1 second

// Choose only one TRUE option below
this.EDDSA_FLAG = true;
this.HMAC_FLAG = false;
this.NO_SIG_FLAG = false;

this.BENCHMARK_FLAG = true; // set true during benchmarking
this.DEBUGGING_FLAG = false; // set true to display log
this.DYNAMIC_REQUEST_POOL_FLAG = true; // set true to enable dynamic request pool size
```

Then, we need to run the core engine in all four of the notary nodes.

```console
vagrant@notary1:~$ cd ~/src
vagrant@notary1:~$ npm run core1

vagrant@notary2:~$ npm run core2
vagrant@notary3:~$ npm run core3
vagrant@notary4:~$ npm run core4
```

Once it is running, start the proxy node.
Run this in all proxy nodes (`proxy1` to `proxy4`).
Choose between one of these `proxy-default` or `proxy-priority`.

```console
vagrant@proxy1:~$ cd ~/src
vagrant@proxy1:~$ npm run proxy-default # without prority feature
vagrant@proxy1:~$ npm run proxy-priority # with priority feature
```

Then, open two new terminals, and run each of these commands in each terminal.

```console
foo@ubuntu:~$ npm run bench-prioriy # run autocannon instance to send requests to proxies
foo@ubuntu:~$ npm run bench-count # background process that will record the number of Tx in block every 5 seconds
```

You can get the measurement results from `~/result_block_count.json` and `~/result_autocannon.csv`.

- - - -

## Known Issues ##

If the node cannot ping to one another, perhaps it has the problem with the Avahi DNS.
Try to ping to itself using the configured domain in all nodes.
Then, try to ping one another.

```console
vagrant@proxy1:~$ ping proxy1.local # run this in proxy #1
vagrant@proxy2:~$ ping proxy2.local # run this in proxy #2
vagrant@proxy3:~$ ping proxy3.local # run this in proxy #3
vagrant@proxy4:~$ ping proxy4.local # run this in proxy #4

# then try to ping one another, this should solves the issues
```

When address is already used, run the following to kill the existing application.

```console
vagrant@proxy1:~$ sudo kill -9 `sudo lsof -t -i:3001` # kill app that use 3001
vagrant@proxy1:~$ sudo kill -9 $(sudo lsof -t -i:9001) # kill app that use 9001
```

If for some reason it is not possible, run the app using other port number.
To run using 5001 port

```console
vagrant@proxy1:~$ cd ~/src
vagrant@proxy1:~$ HTTP_PORT=5001 USING_PRIORITY=true node --experimental-worker app.js
```

## Authors ##

* **Yustus Oktian** - *Initial work*

## Acknowledgments ##

* Hat tip to anyone whose code was used
* Fellow researchers
* Korea Government for funding this project
