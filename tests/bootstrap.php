<?php
define( 'ABSPATH', dirname( __DIR__ ) . '/' );

$GLOBALS['cheatjs_test_filters'] = [];
$GLOBALS['cheatjs_test_options'] = [];
$GLOBALS['cheatjs_test_actions'] = [];
$GLOBALS['cheatjs_test_assets'] = [
    'scripts' => [],
    'styles'  => [],
    'inline'  => [],
];
$GLOBALS['cheatjs_test_registered_settings'] = [];
$GLOBALS['cheatjs_test_options_pages'] = [];

function add_filter( $hook, $callback, $priority = 10, $accepted_args = 1 ) {
    $GLOBALS['cheatjs_test_filters'][ $hook ][ $priority ][] = [
        'callback'      => $callback,
        'accepted_args' => $accepted_args,
    ];
    return true;
}

function apply_filters( $hook, $value, ...$args ) {
    if ( empty( $GLOBALS['cheatjs_test_filters'][ $hook ] ) ) {
        return $value;
    }
    ksort( $GLOBALS['cheatjs_test_filters'][ $hook ] );
    foreach ( $GLOBALS['cheatjs_test_filters'][ $hook ] as $callbacks ) {
        foreach ( $callbacks as $filter ) {
            $filter_args = array_slice( array_merge( [ $value ], $args ), 0, $filter['accepted_args'] );
            $value = call_user_func_array( $filter['callback'], $filter_args );
        }
    }
    return $value;
}

function add_action( $hook, $callback, $priority = 10, $accepted_args = 1 ) {
    $GLOBALS['cheatjs_test_actions'][ $hook ][ $priority ][] = [
        'callback'      => $callback,
        'accepted_args' => $accepted_args,
    ];
    return true;
}

function do_action( $hook, ...$args ) {
    if ( empty( $GLOBALS['cheatjs_test_actions'][ $hook ] ) ) {
        return;
    }
    ksort( $GLOBALS['cheatjs_test_actions'][ $hook ] );
    foreach ( $GLOBALS['cheatjs_test_actions'][ $hook ] as $callbacks ) {
        foreach ( $callbacks as $action ) {
            call_user_func_array( $action['callback'], array_slice( $args, 0, $action['accepted_args'] ) );
        }
    }
}

function get_option( $name, $default = false ) {
    return array_key_exists( $name, $GLOBALS['cheatjs_test_options'] ) ? $GLOBALS['cheatjs_test_options'][ $name ] : $default;
}

function update_option( $name, $value ) {
    $GLOBALS['cheatjs_test_options'][ $name ] = $value;
    return true;
}

function absint( $value ) {
    return abs( (int) $value );
}

function sanitize_key( $key ) {
    return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $key ) );
}

function sanitize_html_class( $class, $fallback = '' ) {
    $class = preg_replace( '/[^A-Za-z0-9_\-]/', '', (string) $class );
    return $class === '' ? $fallback : $class;
}

function sanitize_text_field( $value ) {
    return trim( preg_replace( '/[\r\n\t ]+/', ' ', strip_tags( (string) $value ) ) );
}

function esc_html( $value ) {
    return htmlspecialchars( (string) $value, ENT_QUOTES, 'UTF-8' );
}

function esc_attr( $value ) {
    return htmlspecialchars( (string) $value, ENT_QUOTES, 'UTF-8' );
}

function esc_url( $value ) {
    return esc_attr( $value );
}

function wp_json_encode( $value ) {
    return json_encode( $value, JSON_UNESCAPED_SLASHES );
}

function checked( $checked, $current = true, $display = true ) {
    $result = (string) $checked === (string) $current ? ' checked="checked"' : '';
    if ( $display ) {
        echo $result;
    }
    return $result;
}

function settings_fields( $group ) {
    echo '<input type="hidden" name="option_page" value="' . esc_attr( $group ) . '">';
}

function submit_button( $text = 'Save Changes' ) {
    echo '<p class="submit"><button type="submit">' . esc_html( $text ) . '</button></p>';
}

function admin_url( $path = '' ) {
    return 'http://example.test/wp-admin/' . ltrim( $path, '/' );
}

function current_user_can( $capability ) {
    return $capability === 'manage_options';
}

function add_options_page( $page_title = '', $menu_title = '', $capability = '', $menu_slug = '', $callback = null ) {
    $GLOBALS['cheatjs_test_options_pages'][] = compact( 'page_title', 'menu_title', 'capability', 'menu_slug', 'callback' );
    return 'settings_page_cheatjs';
}

function register_setting( $option_group = '', $option_name = '', $args = [] ) {
    $GLOBALS['cheatjs_test_registered_settings'][] = compact( 'option_group', 'option_name', 'args' );
    return true;
}

function wp_enqueue_script( $handle, $src = '', $deps = [], $ver = false, $args = [] ) {
    $GLOBALS['cheatjs_test_assets']['scripts'][ $handle ] = compact( 'src', 'deps', 'ver', 'args' );
}

function wp_enqueue_style( $handle, $src = '', $deps = [], $ver = false ) {
    $GLOBALS['cheatjs_test_assets']['styles'][ $handle ] = compact( 'src', 'deps', 'ver' );
}

function wp_add_inline_script( $handle, $data, $position = 'after' ) {
    $GLOBALS['cheatjs_test_assets']['inline'][ $handle ][] = compact( 'data', 'position' );
}

function plugin_dir_url( $file ) {
    return 'http://example.test/wp-content/plugins/cheatjs/';
}

function plugin_dir_path( $file ) {
    return dirname( __DIR__ ) . '/';
}

function register_activation_hook() {
    return true;
}
