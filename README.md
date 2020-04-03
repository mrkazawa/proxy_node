# Proxy Classifier Node #

## Setup ##

You need `vagrant` and `virtualbox` for this project.
So install them first if you do not have it yet in your machine.
You can download them [here](https://www.vagrantup.com/downloads.html) and [here](https://www.virtualbox.org/wiki/Downloads)
All of the required softwares and tools has been included in the `Vagrantfile` and it will be installed during the `vagrant up` using shell provisioning scripts in `/shell` directory.

## Installation ##

Run the following command:

```bash
# download all resources from this github
git clone https://github.com/mrkazawa/proxy_classifier.git
cd proxy_classifier

vagrant up
# this will take a while
# it create virtuabox vm and provisions all softwares inside the VM
vagrant ssh proxy1
```

You are now successfully SSH to a VM called `proxy1`.
Inside this VM you still need to install the package dependencies.

```bash
cd ~/src
npm install
```

## Running ##

Inside the Vagrant VM `proxy1` run the following.

```bash
cd ~/src
npm run start # this will run app.js
```

- - - -

## When address is already used ##

```bash
sudo kill -9 `sudo lsof -t -i:3001`
sudo kill -9 $(sudo lsof -t -i:9001)
```

## Authors ##

* **Yustus Oktian** - *Initial work*

## Acknowledgments ##

* Hat tip to anyone whose code was used
* Fellow researchers
* Korea Government for funding this project
