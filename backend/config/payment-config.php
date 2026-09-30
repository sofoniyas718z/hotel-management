<?php
function getPaymentConfig() {
    return [
        'chapa' => [
            'secret_key' => getenv('CHAPA_SECRET_KEY') ?: 'CHASECK_TEST-xxxxxxxxxxxxx',
            'public_key' => getenv('CHAPA_PUBLIC_KEY') ?: 'CHAPUBK_TEST-xxxxxxxxxxxxx',
            'base_url' => getenv('CHAPA_BASE_URL') ?: 'https://api.chapa.co/v1',
            'webhook_secret' => getenv('CHAPA_WEBHOOK_SECRET') ?: '',
        ],
        'telebirr' => [
            'app_id' => getenv('TELEBIRR_APP_ID') ?: '',
            'app_key' => getenv('TELEBIRR_APP_KEY') ?: '',
            'short_code' => getenv('TELEBIRR_SHORT_CODE') ?: '',
            'base_url' => getenv('TELEBIRR_BASE_URL') ?: 'https://telebirr-api.ethernet.et',
            'notify_url' => getenv('TELEBIRR_NOTIFY_URL') ?: 'http://localhost/hotel-management/backend/api/payment-callback.php?gateway=telebirr',
        ],
        'currency' => 'ETB',
        'callback_base_url' => getenv('CALLBACK_BASE_URL') ?: 'http://localhost/hotel-management/backend/api',
    ];
}

// Helper functions
function getChapaConfig() {
    $config = getPaymentConfig();
    return $config['chapa'];
}

function getTeleBirrConfig() {
    $config = getPaymentConfig();
    return $config['telebirr'];
}
?>