# -*- mode: ruby -*-
# vi: set ft=ruby :

# Vagrant file configuration I learnt from here
# https://manski.net/2016/09/vagrant-multi-machine-tutorial/

BOX_IMAGE = "bento/ubuntu-16.04"
BOX_MEMORY = "2048"
BOX_CPU = 1

PROXY_COUNT = 1

Vagrant.configure("2") do |config|
  (1..PROXY_COUNT).each do |i|
    config.vm.define "proxy#{i}" do |subconfig|
      subconfig.vm.box = BOX_IMAGE
      subconfig.vm.box_check_update = true
      subconfig.vm.hostname = "proxy#{i}"
      subconfig.vm.network :private_network, ip: "10.0.0.#{i + 20}"

      subconfig.vm.provider "virtualbox" do |vb|
        vb.name = "proxy#{i}"
        vb.memory = BOX_MEMORY
        vb.cpus = BOX_CPU
      end
    end
  end

  # Installation (WARNING! the order matters)
  config.vm.provision "shell", path: "shell/base_install.sh", privileged: true
  # node JS has to be provisioned last
  config.vm.provision "shell", path: "shell/nvm_install.sh", privileged: false

  # shared folders setup using RSYNC
  config.vm.synced_folder "src/", "/home/vagrant/src", type: "rsync"
end