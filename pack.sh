#! /bin/bash
# arguments: client_id client_secret

cd signature-extension
cp -f api.js ../api.js.tmp
sed -i "s/<CLIENT_ID>/$1/" api.js
sed -i "s/<CLIENT_SECRET>/$2/" api.js
rm -f signature-extension.xpi
zip -r ../signature-extension.xpi .
mv -f ../api.js.tmp api.js
cd ..