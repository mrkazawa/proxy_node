# Proxy Node #

This repository is the implementation of the agent node from our paper "", which is published [here]().
To run the proxy nodes, you also need to run all of core engines in the Notary Node, which is available [here](https://github.com/mrkazawa/notary_node).

## Setup ##

You need `vagrant` and `virtualbox` for this project.
So install them first if you do not have it yet in your machine.
You can download them [here](https://www.vagrantup.com/downloads.html) and [here](https://www.virtualbox.org/wiki/Downloads)
All of the required softwares and tools has been included in the `Vagrantfile` and it will be installed during the `vagrant up` using shell provisioning scripts in `/shell` directory.

## Installation ##

Run the following command:

```console
foo@ubuntu:~$ cd ~/
foo@ubuntu:~$ git clone https://github.com/mrkazawa/proxy_node.git
foo@ubuntu:~$ cd ~/proxy_node

foo@ubuntu:~$ vagrant up # if it is our first time, this will take some times
foo@ubuntu:~$ vagrant rsync-auto

# open another terminal for proxy1
foo@ubuntu:~$ cd ~/proxy_node
foo@ubuntu:~$ cd vagrant ssh proxy1

# open another terminal for proxy2
foo@ubuntu:~$ cd ~/proxy_node
foo@ubuntu:~$ cd vagrant ssh proxy2

# open another terminal for proxy3
foo@ubuntu:~$ cd ~/proxy_node
foo@ubuntu:~$ cd vagrant ssh proxy3

# open another terminal for proxy4
foo@ubuntu:~$ cd ~/proxy_node
foo@ubuntu:~$ cd vagrant ssh proxy4
```

```bash
git clone https://github.com/mrkazawa/proxy_node.git
cd ~/proxy_node

vagrant up # if it is our first time, this will take some times
vagrant rsync-auto

# open another terminal for proxy1
vagrant ssh proxy1
# open another terminal for proxy2
vagrant ssh proxy2
# open another terminal for proxy3
vagrant ssh proxy3
# open another terminal for proxy4
vagrant ssh proxy4
```

Inside the SSH instances, we need to install all of the Node JS dependencies.

```bash
cd ~/src
npm install # run this in all proxies (1, 2, 3, and 4)

npm run-script # show all available NPM commands
```

Other useful commands, run outside of the SSH instances,

```bash
cd ~/proxy_node
vagrant reload # to restart VM
vagrant halt # to shutdwon VM
vagrant destroy -f # to completely delete VM
```

- - - -

## Running The Proxies ##

The proxy will relay messages from IoT agents to the notary node.
Therefore, it depends on the notary node.
The notary node has to be run first.
[Here](https://github.com/mrkazawa/notary_node) is the guide to run the notary node.

Inside the Vagrant VM of the respective proxy, run the following.

```bash
cd ~/src
npm run proxy-default # without prority feature
npm run proxy-priority # with priority feature
```

You can then start making request to the Proxy nodes.

```bash
http://proxy1.local:3001/relay_request
http://proxy2.local:3001/relay_request
http://proxy3.local:3001/relay_request
http://proxy4.local:3001/relay_request
```

- - - -

## Benchmarking The Core Engine With Priority ##

The purpose of this benchmarking is to see the behaviour of the Proxy node to prioritize IoT requests from agents according to their `priority_id` tag.
First, lets setup the Notay node.
The core engine in the notary node need to have the following configuration in their `src/core/config.js`.

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
After that, we begin to run our proxy nodes.
Open the following codes in each of the proxy VNs (total, you need 4 terminals).

```bash
cd ~/src
npm run proxy-default # without prority feature

# to run the priority version, run the following instead.
npm run proxy-priority # with priority feature
```

Then, open two new terminals, and run each of these commands in each terminal.

```bash
# run autocannon instance to send requests to proxies
npm run bench-prioriy

# background process that will record the number of Tx in block
# every 5 seconds
npm run bench-count
```

```bash
cd ~/src
npm run proxy-default # without prority feature
npm run proxy-priority # with priority feature

# run autocannon instance to send requests to proxies
npm run bench-prioriy

# background process that will record the number of Tx in block
# every 5 seconds
npm run bench-count
```

- - - -

## Known Issues ##

If the node cannot ping to one another, perhaps it has the problem with the Avahi DNS.
Try to ping to itself using the configured domain in all nodes.
Then, try to ping one another.

```bash
ping proxy1.local # run this in proxy #1
ping proxy2.local # run this in proxy #2
ping proxy3.local # run this in proxy #3
ping proxy4.local # run this in proxy #4

# then try to ping one another, this should solves the issues
```

When address is already used, run the following to kill the existing application.
If for some reason it is not possible, run the app using other port number.

```bash
sudo kill -9 `sudo lsof -t -i:3001` # kill app that use 3001
sudo kill -9 $(sudo lsof -t -i:9001) # kill app that use 9001

# to run using 5001 port
HTTP_PORT=5001 USING_PRIORITY=true node --experimental-worker app.js
```

## Authors ##

* **Yustus Oktian** - *Initial work*

## Acknowledgments ##

* Hat tip to anyone whose code was used
* Fellow researchers
* Korea Government for funding this project
