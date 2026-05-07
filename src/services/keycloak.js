/**
 * keycloak.js — Singleton Keycloak instance for the Digital Twin platform.
 *
 * Usage:
 *   import { initKeycloak, doLogout } from './keycloak';
 *   import keycloak from './keycloak';   // the raw instance
 */

import Keycloak from 'keycloak-js';

const keycloakConfig = {
    url: 'http://localhost:8080',
    realm: 'DigitalTwin',
    clientId: 'digital-twin-client',
};

const keycloak = new Keycloak(keycloakConfig);

/**
 * Initialise Keycloak with the 'login-required' flow.
 * Redirects to Keycloak login page if the user is not authenticated.
 * Calls onReady(token, tokenParsed) once authenticated.
 */
export function initKeycloak(onReady, onError) {
    keycloak
        .init({
            onLoad: 'login-required',
            checkLoginIframe: false,   // avoids silent-check-sso CORS issues in dev
            pkceMethod: 'S256',
        })
        .then((authenticated) => {
            if (authenticated) {
                onReady(keycloak.token, keycloak.tokenParsed);
            } else {
                keycloak.login();
            }
        })
        .catch((err) => {
            console.error('Keycloak init failed:', err);
            if (onError) onError(err);
        });
}

/**
 * Logout and redirect back to the app root.
 */
export function doLogout() {
    keycloak.logout({ redirectUri: window.location.origin });
}

export default keycloak;
