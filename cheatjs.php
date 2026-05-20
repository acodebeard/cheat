<?php
/**
 * Plugin Name: CheatJS
 * Description: Playful keyboard easter eggs for WordPress sites.
 * Version: 0.1.0
 * Author: CheatJS Contributors
 * License: GPL-3.0-or-later
 * Text Domain: cheatjs
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'CHEATJS_VERSION', '0.1.0' );
define( 'CHEATJS_FILE', __FILE__ );
define( 'CHEATJS_DIR', plugin_dir_path( __FILE__ ) );
define( 'CHEATJS_URL', plugin_dir_url( __FILE__ ) );

require_once CHEATJS_DIR . 'includes/class-cheatjs-keys.php';
require_once CHEATJS_DIR . 'includes/class-cheatjs-presets.php';
require_once CHEATJS_DIR . 'includes/class-cheatjs-settings.php';
require_once CHEATJS_DIR . 'includes/class-cheatjs-admin.php';
require_once CHEATJS_DIR . 'includes/class-cheatjs-frontend.php';
require_once CHEATJS_DIR . 'includes/class-cheatjs-plugin.php';

$cheatjs_settings = new CheatJS_Settings();
$cheatjs_plugin   = new CheatJS_Plugin(
    $cheatjs_settings,
    new CheatJS_Admin( $cheatjs_settings ),
    new CheatJS_Frontend( $cheatjs_settings )
);

register_activation_hook( CHEATJS_FILE, [ $cheatjs_plugin, 'activate' ] );
add_action( 'plugins_loaded', [ $cheatjs_plugin, 'hooks' ] );
