. "$(dirname "$0")/functions.sh"
setup
install

cat > index.js << EOL
process.env.PATH = ''
require('@gautaz/husky').install()
EOL
expect 0 "node index.js" 

