# Add color to the prompt of vagrant ssh

cd /home/vagrant

if [[ ! -f .bash_profile ]]; then
    touch .bash_profile
    echo 'source ~/.profile' >>.bash_profile
    echo 'export PS1="\e[0;32m[\u@\h \W]\$ \e[m "' >>.bash_profile
    source .bash_profile
else
    echo "Skipping, BASH PROFILE already configured"
fi