<?php
/**
 * Admin settings page for CheatJS.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class CheatJS_Admin {
    private const MENU_SLUG = 'cheatjs';
    private const PAGE_HOOK = 'settings_page_cheatjs';

    private CheatJS_Settings $settings;
    private string $page_hook = self::PAGE_HOOK;

    public function __construct( ?CheatJS_Settings $settings = null ) {
        $this->settings = $settings ?: new CheatJS_Settings();
    }

    public function register_menu(): void {
        $this->page_hook = add_options_page(
            'CheatJS Settings',
            'CheatJS',
            'manage_options',
            self::MENU_SLUG,
            [ $this, 'render_page' ]
        );
    }

    public function register_page(): void {
        $this->register_menu();
    }

    public function register_settings(): void {
        register_setting(
            CheatJS_Settings::OPTION_NAME,
            CheatJS_Settings::OPTION_NAME,
            [
                'sanitize_callback' => [ $this->settings, 'sanitize' ],
                'default'           => $this->settings->get_defaults(),
            ]
        );
    }

    public function enqueue_assets( $hook ): void {
        if ( $hook !== $this->page_hook && $hook !== self::PAGE_HOOK ) {
            return;
        }

        $base_file = defined( 'CHEATJS_FILE' ) ? CHEATJS_FILE : dirname( __DIR__ ) . '/cheatjs.php';
        $base_url  = defined( 'CHEATJS_URL' ) ? CHEATJS_URL : plugin_dir_url( $base_file );
        $version   = defined( 'CHEATJS_VERSION' ) ? CHEATJS_VERSION : '0.1.0';

        wp_enqueue_style(
            'cheatjs-admin',
            $base_url . 'assets/css/cheatjs-admin.css',
            [],
            $version
        );
    }

    public function render_page(): void {
        if ( ! current_user_can( 'manage_options' ) ) {
            if ( function_exists( 'wp_die' ) ) {
                wp_die( esc_html( 'Sorry, you are not allowed to access this page.' ) );
            }

            return;
        }

        $settings = $this->settings->get();
        ?>
        <div class="wrap cheatjs-admin">
            <h1><?php echo esc_html( 'CheatJS Settings' ); ?></h1>
            <form method="post" action="options.php">
                <?php settings_fields( CheatJS_Settings::OPTION_NAME ); ?>

                <section class="cheatjs-admin-section">
                    <h2><?php echo esc_html( 'Global Settings' ); ?></h2>
                    <input type="hidden" name="<?php echo esc_attr( CheatJS_Settings::OPTION_NAME ); ?>[max_gap_ms]" value="<?php echo esc_attr( $settings['max_gap_ms'] ); ?>">
                    <label class="cheatjs-toggle">
                        <input type="hidden" name="<?php echo esc_attr( CheatJS_Settings::OPTION_NAME ); ?>[global_enabled]" value="0">
                        <input type="checkbox" name="<?php echo esc_attr( CheatJS_Settings::OPTION_NAME ); ?>[global_enabled]" value="1"<?php checked( ! empty( $settings['global_enabled'] ) ); ?>>
                        <span><?php echo esc_html( 'Enable CheatJS effects' ); ?></span>
                    </label>
                </section>

                <section class="cheatjs-admin-section">
                    <h2><?php echo esc_html( 'Presets' ); ?></h2>
                    <div class="cheatjs-presets">
                        <?php
                        foreach ( CheatJS_Presets::get_presets() as $id => $preset ) {
                            $preset_settings = $settings['presets'][ $id ] ?? [
                                'enabled'  => $preset['default_enabled'],
                                'sequence' => $preset['default_sequence'],
                            ];

                            $this->render_preset( $id, $preset, $preset_settings );
                        }
                        ?>
                    </div>
                </section>

                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    private function render_preset( string $id, array $preset, array $preset_settings ): void {
        $sequence         = CheatJS_Keys::parse_sequence( $preset_settings['sequence'] ?? $preset['default_sequence'] );
        $default_sequence = CheatJS_Keys::parse_sequence( $preset['default_sequence'] );
        $sequence_value   = implode( ',', $sequence );
        $default_value    = implode( ',', $default_sequence );
        $enabled          = ! empty( $preset_settings['enabled'] );
        $option_name      = CheatJS_Settings::OPTION_NAME . '[presets][' . $id . ']';
        ?>
        <article
            class="cheatjs-preset cheatjs-preset-<?php echo esc_attr( sanitize_html_class( $id ) ); ?>"
            data-cheatjs-preset="<?php echo esc_attr( $id ); ?>"
            data-default-sequence="<?php echo esc_attr( $default_value ); ?>"
        >
            <div class="cheatjs-preset-header">
                <div>
                    <h3><?php echo esc_html( $preset['name'] ); ?></h3>
                    <p><?php echo esc_html( $preset['description'] ); ?></p>
                </div>
                <label class="cheatjs-toggle">
                    <input type="hidden" name="<?php echo esc_attr( $option_name ); ?>[enabled]" value="0">
                    <input type="checkbox" name="<?php echo esc_attr( $option_name ); ?>[enabled]" value="1"<?php checked( $enabled ); ?>>
                    <span><?php echo esc_html( 'Enabled' ); ?></span>
                </label>
            </div>

            <input
                type="hidden"
                class="cheatjs-sequence-input"
                name="<?php echo esc_attr( $option_name ); ?>[sequence]"
                value="<?php echo esc_attr( $sequence_value ); ?>"
            >

            <?php $this->render_key_chips( $sequence ); ?>

            <div class="cheatjs-preset-actions">
                <button type="button" class="cheatjs-record"><?php echo esc_html( 'Record' ); ?></button>
                <button type="button" class="cheatjs-clear"><?php echo esc_html( 'Clear' ); ?></button>
                <button type="button" class="cheatjs-reset"><?php echo esc_html( 'Reset default' ); ?></button>
                <button type="button" class="cheatjs-done"><?php echo esc_html( 'Done' ); ?></button>
            </div>
        </article>
        <?php
    }

    private function render_key_chips( array $sequence ): void {
        ?>
        <div class="cheatjs-key-chips">
            <?php foreach ( $sequence as $key ) : ?>
                <span class="cheatjs-key-chip"><?php echo esc_html( $key ); ?></span>
            <?php endforeach; ?>
        </div>
        <?php
    }
}
