# Bash file for Vagrant provisioning only
# It will called automatically during the FIRST 'vagrant up'
# When boxes already created, we can provision again by adding '--provision' param

# For instance,
# vagrant up --provision
# vagrant reload --provision

# update linux package repo
apt-get update

# installing Avahi DNS and mDNS
apt-get install -y avahi-daemon libnss-mdns