#--------------------------- Installing Node Version Manager ---------------------------#

NVM_INSTALLER=install.sh

cd /home/vagrant
mkdir nvm_installer
cd nvm_installer

if [[ ! -f $NVM_INSTALLER ]]; then
    wget --quiet https://raw.githubusercontent.com/creationix/nvm/v0.33.8/$NVM_INSTALLER
    chmod +x $NVM_INSTALLER
    ./$NVM_INSTALLER

    source $HOME/.nvm/nvm.sh
    # Install given node version and make it default
    nvm install 10.18.0
    nvm alias default 10.18.0
else
    echo "Skipping, NVM is already installed"
fi