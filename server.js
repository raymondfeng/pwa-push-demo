// Use the web-push library to hide the implementation details of the communication
// between the application server and the push service.
// For details, see https://tools.ietf.org/html/draft-ietf-webpush-protocol and
// https://tools.ietf.org/html/draft-ietf-webpush-encryption.
const webPush = require('web-push');
const express = require('express');
const app = express();
const path = require('path');

let vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (!vapidPublicKey || !vapidPrivateKey) {
  const keys = webPush.generateVAPIDKeys();
  vapidPublicKey = keys.publicKey;
  vapidPrivateKey = keys.privateKey;
  console.log('VAPID Public Key: %s', vapidPublicKey);
  console.log('VAPID Private Key: %s', vapidPrivateKey);
}
// Set the keys used for encrypting the push messages.
webPush.setVapidDetails(
  'https://example.com/',
  vapidPublicKey,
  vapidPrivateKey,
);

// Global array collecting all active endpoints. In real world
// application one would use a database here.
const subscriptions = {};

function routes(route) {
  app.get(route + 'vapidPublicKey', function (req, res) {
    res.send(vapidPublicKey);
  });

  app.post(route + 'register', function (req, res) {
    const subscription = req.body.subscription;
    if (!subscriptions[subscription.endpoint]) {
      console.log('Subscription registered ' + subscription.endpoint);
      subscriptions[subscription.endpoint] = subscription;
    }
    res.sendStatus(201);
  });

  app.post(route + 'unregister', function (req, res) {
    var subscription = req.body.subscription;
    if (subscriptions[subscription.endpoint]) {
      console.log('Subscription unregistered ' + subscription.endpoint);
      delete subscriptions[subscription.endpoint];
    }
    res.sendStatus(201);
  });

  app.post(route + 'sendNotification', function (req, res) {
    const subscription = req.body.subscription;
    const payload = req.body.payload;
    const options = {
      TTL: req.body.ttl,
    };

    setTimeout(function () {
      webPush
        .sendNotification(subscription, payload, options)
        .then(function () {
          res.sendStatus(201);
        })
        .catch(function (error) {
          console.log(error);
          delete subscriptions[subscription.endpoint];
          res.sendStatus(500);
        });
    }, req.body.delay * 1000);
  });
}

app.use('/', express.static(path.join(__dirname, './public')));
app.use(express.json());
routes('/');

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});
