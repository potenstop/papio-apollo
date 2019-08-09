git pull
npm install
npm run build
version=`jq -r '.version' package.json`
git tag -a ${version} -m 'publish'
git push origin --tags
npm publish
