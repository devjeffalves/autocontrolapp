package com.autocontrol.app;

import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;

public class OverlayHUDService extends Service {
    private WindowManager windowManager;
    private View overlayView;
    private Handler autoDismissHandler = new Handler(Looper.getMainLooper());
    private Runnable dismissRunnable;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String badge = intent.getStringExtra("badge");
            String colorHex = intent.getStringExtra("color");
            double price = intent.getDoubleExtra("price", 0);
            double distanceKm = intent.getDoubleExtra("distanceKm", 0);
            double ratePerKm = intent.getDoubleExtra("ratePerKm", 0);
            double ratePerHour = intent.getDoubleExtra("ratePerHour", 0);
            double netProfit = intent.getDoubleExtra("netProfit", 0);

            showHUD(badge, colorHex, price, distanceKm, ratePerKm, ratePerHour, netProfit);
        }
        return START_NOT_STICKY;
    }

    private void showHUD(String badge, String colorHex, double price, double distanceKm, double ratePerKm, double ratePerHour, double netProfit) {
        removeHUD();

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);

        int layoutType;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            layoutType = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            layoutType = WindowManager.LayoutParams.TYPE_PHONE;
        }

        final WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                layoutType,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                PixelFormat.TRANSLUCENT
        );

        params.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
        params.y = 80; // Margin from top

        // Main HUD container
        LinearLayout container = new LinearLayout(this);
        container.setOrientation(LinearLayout.VERTICAL);
        container.setPadding(32, 24, 32, 24);

        int bgCardColor = Color.parseColor("#1e293b"); // Sleek dark theme
        int badgeBgColor = Color.parseColor(colorHex != null ? colorHex : "#10b981");

        GradientDrawable shape = new GradientDrawable();
        shape.setCornerRadius(36f);
        shape.setColor(bgCardColor);
        shape.setStroke(3, badgeBgColor);
        container.setBackground(shape);

        // Header (Badge Title)
        TextView titleView = new TextView(this);
        titleView.setText("AutoControl • " + (badge != null ? badge : "OFERTA"));
        titleView.setTextColor(Color.WHITE);
        titleView.setTextSize(16f);
        titleView.setTypeface(null, android.graphics.Typeface.BOLD);
        titleView.setGravity(Gravity.CENTER);
        container.addView(titleView);

        // Subtitle (Rates & Profit)
        TextView detailView = new TextView(this);
        String details = String.format("R$ %.2f (%s km) ➔ R$ %.2f/km | R$ %.0f/h\nLucro Estimado: R$ %.2f", 
                price, String.format("%.1f", distanceKm), ratePerKm, ratePerHour, netProfit);
        detailView.setText(details);
        detailView.setTextColor(Color.parseColor("#cbd5e1"));
        detailView.setTextSize(13f);
        detailView.setGravity(Gravity.CENTER);
        detailView.setPadding(0, 8, 0, 0);
        container.addView(detailView);

        // Touch to dismiss
        container.setOnTouchListener(new View.OnTouchListener() {
            @Override
            public boolean onTouch(View v, MotionEvent event) {
                removeHUD();
                return true;
            }
        });

        overlayView = container;
        windowManager.addView(overlayView, params);

        // Auto dismiss after 12 seconds
        dismissRunnable = new Runnable() {
            @Override
            public void run() {
                removeHUD();
            }
        };
        autoDismissHandler.postDelayed(dismissRunnable, 12000);
    }

    private void removeHUD() {
        if (dismissRunnable != null) {
            autoDismissHandler.removeCallbacks(dismissRunnable);
        }
        if (overlayView != null && windowManager != null) {
            try {
                windowManager.removeView(overlayView);
            } catch (Exception ignored) {}
            overlayView = null;
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        removeHUD();
    }
}
