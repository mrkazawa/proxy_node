# Add color to the prompt of vagrant ssh

cd /home/vagrant

if [[ ! -f .bash_profile ]]; then
    touch .bash_profile
    echo 'source ~/.profile' >>.bash_profile
    echo 'BGREEN="\[\033[01;32m\]"' >>.bash_profile
    echo 'BYELLOW="\[\033[01;33m\]"' >>.bash_profile
    echo 'BCYAN="\[\033[01;36m\]"' >>.bash_profile
    echo 'IBLACK="\[\033[0;90m\]"' >>.bash_profile
    echo 'PS_CLEAR="\[\033[0m\]"' >>.bash_profile
    echo 'export PS1="${BGREEN}\u ${BYELLOW}\h ${BCYAN}\w${PS_CLEAR}\n${IBLACK}\$ "' >>.bash_profile
    source .bash_profile
else
    echo "Skipping, BASH PROFILE already configured"
fi