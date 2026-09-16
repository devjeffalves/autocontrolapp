package com.autocontrol.app;

import android.accessibilityservice.AccessibilityService;
import android.content.Intent;
import android.text.TextUtils;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class AutoControlAccessibilityService extends AccessibilityService {

    private String lastProcessedText = "";
    private long lastProcessedTime = 0;

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;

        CharSequence packageName = event.getPackageName();
        if (packageName == null) return;

        String pkg = packageName.toString();
        if ("com.ubercab.driver".equals(pkg) || "com.taxis99.driver".equals(pkg)) {
            AccessibilityNodeInfo rootNode = getRootInActiveWindow();
            if (rootNode != null) {
                List<String> screenTexts = new ArrayList<>();
                collectTextNodes(rootNode, screenTexts);
                rootNode.recycle();

                if (!screenTexts.isEmpty()) {
                    processScreenContent(screenTexts);
                }
            }
        }
    }

    private void collectTextNodes(AccessibilityNodeInfo node, List<String> texts) {
        if (node == null) return;

        CharSequence text = node.getText();
        if (!TextUtils.isEmpty(text)) {
            texts.add(text.toString());
        }

        CharSequence contentDesc = node.getContentDescription();
        if (!TextUtils.isEmpty(contentDesc)) {
            texts.add(contentDesc.toString());
        }

        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) {
                collectTextNodes(child, texts);
                child.recycle();
            }
        }
    }

    private void processScreenContent(List<String> texts) {
        String combinedText = TextUtils.join(" | ", texts);
        long now = System.currentTimeMillis();

        // Avoid re-processing exact same offer within 5 seconds
        if (combinedText.equals(lastProcessedText) && (now - lastProcessedTime < 5000)) {
            return;
        }

        double price = 0;
        double distanceKm = 0;
        double timeMinutes = 0;

        // Regex patterns for Uber and 99 offer cards
        Pattern pricePattern = Pattern.compile("R\\$\\s*(\\d+[.,]\\d{2})|(\\d+[.,]\\d{2})\\s*R\\$");
        Pattern kmPattern = Pattern.compile("(\\d+[.,]?\\d*)\\s*km", Pattern.CASE_INSENSITIVE);
        Pattern minPattern = Pattern.compile("(\\d+)\\s*min", Pattern.CASE_INSENSITIVE);

        Matcher priceMatcher = pricePattern.matcher(combinedText);
        if (priceMatcher.find()) {
            String val = priceMatcher.group(1) != null ? priceMatcher.group(1) : priceMatcher.group(2);
            if (val != null) price = parseDouble(val);
        }

        Matcher kmMatcher = kmPattern.matcher(combinedText);
        if (kmMatcher.find()) {
            distanceKm = parseDouble(kmMatcher.group(1));
        }

        Matcher minMatcher = minPattern.matcher(combinedText);
        if (minMatcher.find()) {
            timeMinutes = parseDouble(minMatcher.group(1));
        }

        // If offer data found (Price > 0 and Distance > 0)
        if (price > 0 && distanceKm > 0) {
            lastProcessedText = combinedText;
            lastProcessedTime = now;

            if (timeMinutes <= 0) timeMinutes = 15; // default fallback time

            evaluateAndShowOverlay(price, distanceKm, timeMinutes);
        }
    }

    private double parseDouble(String str) {
        if (str == null) return 0;
        try {
            return Double.parseDouble(str.replace(",", "."));
        } catch (Exception e) {
            return 0;
        }
    }

    private void evaluateAndShowOverlay(double price, double distanceKm, double timeMinutes) {
        // Defaults parameters from AutoControl (configurable)
        double targetRatePerKm = 2.50;
        double targetRatePerHour = 45.00;
        double minCostPerKm = 1.15;
        double fuelCostPerKm = 0.40;

        double ratePerKm = price / distanceKm;
        double ratePerHour = (price / timeMinutes) * 60;
        double totalFuelCost = distanceKm * fuelCostPerKm;
        double netProfit = price - (distanceKm * minCostPerKm);

        String status = "bad";
        String badge = "🔴 RUIM";
        String colorHex = "#ef4444";

        if (ratePerKm >= targetRatePerKm && ratePerHour >= targetRatePerHour && netProfit > 0) {
            status = "good";
            badge = "🟢 BOA";
            colorHex = "#10b981";
        } else if (ratePerKm >= minCostPerKm && (ratePerKm >= targetRatePerKm || ratePerHour >= targetRatePerHour)) {
            status = "medium";
            badge = "🟡 MEDIANA";
            colorHex = "#f59e0b";
        }

        Intent intent = new Intent(this, OverlayHUDService.class);
        intent.putExtra("badge", badge);
        intent.putExtra("color", colorHex);
        intent.putExtra("price", price);
        intent.putExtra("distanceKm", distanceKm);
        intent.putExtra("ratePerKm", Math.round(ratePerKm * 100.0) / 100.0);
        intent.putExtra("ratePerHour", Math.round(ratePerHour));
        intent.putExtra("netProfit", Math.round(netProfit * 100.0) / 100.0);

        startService(intent);
    }

    @Override
    public void onInterrupt() {}
}
