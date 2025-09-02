// This script handles AdMob integration for the Cordova app.

// The 'deviceready' event fires when Cordova is fully loaded.
// This is the entry point for any Cordova plugin interaction.
document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    console.log('Device is ready. Initializing AdMob.');

    // Start the AdMob SDK.
    admob.start();

    // --- Banner Ad ---
    // This creates and shows a banner ad at the bottom of the screen.
    const banner = new admob.BannerAd({
        adUnitId: 'ca-app-pub-3940256099942544/6300978111',
        position: 'bottom',
    });
    banner.show();


    // --- Interstitial Ad (Example) ---
    // Interstitial ads are full-screen ads. You typically show them at
    // natural transition points in your app, like after completing a level.
    /*
    const interstitial = new admob.InterstitialAd({
        adUnitId: 'ca-app-pub-3940256099942544/1033173712',
    });
    // To show the ad, you would call interstitial.load() first, and then interstitial.show()
    // For example, in a button click event:
    // document.getElementById('myButton').addEventListener('click', async () => {
    //   await interstitial.load();
    //   await interstitial.show();
    // });
    */


    // --- Rewarded Ad (Example) ---
    // Rewarded ads allow users to watch a video in exchange for an in-app reward.
    /*
    const rewarded = new admob.RewardedAd({
        adUnitId: 'ca-app-pub-3940256099942544/5224354917',
    });
    // You would load and show this ad in response to a user action.
    // For example:
    // document.getElementById('watchAdButton').addEventListener('click', async () => {
    //   await rewarded.load();
    //   await rewarded.show();
    // });
    // You can also listen for the reward event:
    // document.addEventListener('admob.rewarded.reward', (evt) => {
    //   console.log('User was rewarded!', evt.reward);
    // });
    */
}
