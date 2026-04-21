{
  "annotations": {
    "list": []
  },
  "editable": true,
  "panels": [
    {
      "type": "timeseries",
      "title": "Requests per Second",
      "targets": [
        {
          "datasource": { "type": "loki", "uid": "cfjnotkaq4gsgc" },
          "expr": "sum(rate({job=\"nginx\"}[1m]))",
          "refId": "A"
        }
      ]
    },
    {
      "type": "timeseries",
      "title": "Status Codes",
      "targets": [
        {
          "datasource": { "type": "loki", "uid": "cfjnotkaq4gsgc" },
          "expr": "sum by (status) (rate({job=\"nginx\"}[1m]))",
          "refId": "A"
        }
      ]
    },
    {
      "type": "barchart",
      "title": "Top IPs",
      "targets": [
        {
          "datasource": { "type": "loki", "uid": "cfjnotkaq4gsgc" },
          "expr": "topk(10, count_over_time({job=\"nginx\"}[5m]) by (ip))",
          "refId": "A"
        }
      ]
    },
    {
      "type": "timeseries",
      "title": "5xx Errors",
      "targets": [
        {
          "datasource": { "type": "loki", "uid": "cfjnotkaq4gsgc" },
          "expr": "sum(rate({job=\"nginx\", status=~\"5..\"}[1m]))",
          "refId": "A"
        }
      ]
    },
    {
      "type": "timeseries",
      "title": "WordPress Scan Attempts",
      "targets": [
        {
          "datasource": { "type": "loki", "uid": "cfjnotkaq4gsgc" },
          "expr": "count_over_time({job=\"nginx\"} |= \"/wp-\" [5m])",
          "refId": "A"
        }
      ]
    },
    {
      "type": "logs",
      "title": "Live Nginx Logs",
      "targets": [
        {
          "datasource": { "type": "loki", "uid": "cfjnotkaq4gsgc" },
          "expr": "{job=\"nginx\"}",
          "refId": "A"
        }
      ]
    },
    {
        "id": 7,
        "type": "timeseries",
        "title": "Nginx Error Rate by Level",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 16 },
        "datasource": { "type": "loki", "uid": "cfjnotkaq4gsgc" },
        "targets": [
            {
            "datasource": { "type": "loki", "uid": "cfjnotkaq4gsgc" },
            "expr": "sum by (level) (count_over_time({job=\"nginx_errors\"}[1m]))",
            "refId": "A"
            }
        ]
    },
    {
        "id": 8,
        "type": "logs",
        "title": "Live Nginx Error Logs",
        "gridPos": { "h": 10, "w": 24, "x": 0, "y": 34 },
        "datasource": { "type": "loki", "uid": "cfjnotkaq4gsgc" },
        "options": {
            "showTime": true,
            "showLabels": true,
            "wrapLogMessage": true,
            "sortOrder": "Descending"
        },
        "targets": [
            {
            "datasource": { "type": "loki", "uid": "cfjnotkaq4gsgc" },
            "expr": "{job=\"nginx_errors\"} |= \"error\" or {job=\"nginx_errors\"} |= \"crit\" or {job=\"nginx_errors\"} |= \"emerg\"",
            "refId": "A"
            }
        ]
    }
  ],
  "schemaVersion": 38,
  "style": "dark",
  "tags": ["nginx", "loki"],
  "title": "ITCO VM Dashboard",
  "version": 1
}






{
  "title": "ERB SERVICE API Metrics",
  "tags": ["nodejs", "prometheus"],
  "style": "dark",
  "schemaVersion": 38,
  "editable": true,
  "version": 1,
  "annotations": { "list": [] },
  "panels": [
    {
      "id": 1,
      "type": "timeseries",
      "title": "HTTP Request Rate (req/sec)",
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 },
      "datasource": { "type": "prometheus", "uid": "afjn3x99fpvr4b" },
      "fieldConfig": {
        "defaults": { "unit": "reqps", "color": { "mode": "palette-classic" } }
      },
      "targets": [
        {
          "datasource": { "type": "prometheus", "uid": "afjn3x99fpvr4b" },
          "expr": "sum by (method, route) (rate(http_request_duration_seconds_count{job=\"nodejs_api\"}[1m]))",
          "legendFormat": "{{method}} {{route}}",
          "refId": "A"
        }
      ]
    },
    {
      "id": 2,
      "type": "timeseries",
      "title": "HTTP Request Latency (p50 / p95 / p99)",
      "gridPos": { "h": 8, "w": 12, "x": 12, "y": 0 },
      "datasource": { "type": "prometheus", "uid": "afjn3x99fpvr4b" },
      "fieldConfig": {
        "defaults": { "unit": "s", "color": { "mode": "palette-classic" } }
      },
      "targets": [
        {
          "datasource": { "type": "prometheus", "uid": "afjn3x99fpvr4b" },
          "expr": "histogram_quantile(0.50, sum by (le) (rate(http_request_duration_seconds_bucket{job=\"nodejs_api\"}[1m])))",
          "legendFormat": "p50",
          "refId": "A"
        },
        {
          "datasource": { "type": "prometheus", "uid": "afjn3x99fpvr4b" },
          "expr": "histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{job=\"nodejs_api\"}[1m])))",
          "legendFormat": "p95",
          "refId": "B"
        },
        {
          "datasource": { "type": "prometheus", "uid": "afjn3x99fpvr4b" },
          "expr": "histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket{job=\"nodejs_api\"}[1m])))",
          "legendFormat": "p99",
          "refId": "C"
        }
      ]
    },
    {
      "id": 3,
      "type": "timeseries",
      "title": "Error Rate (4xx / 5xx)",
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 8 },
      "datasource": { "type": "prometheus", "uid": "afjn3x99fpvr4b" },
      "fieldConfig": {
        "defaults": { "unit": "reqps", "color": { "mode": "palette-classic" } }
      },
      "targets": [
        {
          "datasource": { "type": "prometheus", "uid": "afjn3x99fpvr4b" },
          "expr": "sum(rate(http_request_duration_seconds_count{job=\"nodejs_api\", status_code=~\"4..\"}[1m]))",
          "legendFormat": "4xx",
          "refId": "A"
        },
        {
          "datasource": { "type": "prometheus", "uid": "afjn3x99fpvr4b" },
          "expr": "sum(rate(http_request_duration_seconds_count{job=\"nodejs_api\", status_code=~\"5..\"}[1m]))",
          "legendFormat": "5xx",
          "refId": "B"
        }
      ]
    },
    {
      "id": 4,
      "type": "timeseries",
      "title": "Active HTTP Connections",
      "gridPos": { "h": 8, "w": 12, "x": 12, "y": 8 },
      "datasource": { "type": "prometheus", "uid": "afjn3x99fpvr4b" },
      "fieldConfig": {
        "defaults": { "unit": "short", "color": { "mode": "palette-classic" } }
      },
      "targets": [
        {
          "datasource": { "type": "prometheus", "uid": "afjn3x99fpvr4b" },
          "expr": "http_active_connections{job=\"nodejs_api\"}",
          "legendFormat": "Active connections",
          "refId": "A"
        }
      ]
    },
    {
      "id": 5,
      "type": "timeseries",
      "title": "Event Loop Lag (ms)",
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 16 },
      "datasource": { "type": "prometheus", "uid": "afjn3x99fpvr4b" },
      "fieldConfig": {
        "defaults": { "unit": "ms", "color": { "mode": "palette-classic" } }
      },
      "targets": [
        {
          "datasource": { "type": "prometheus", "uid": "afjn3x99fpvr4b" },
          "expr": "rate(nodejs_eventloop_lag_seconds_sum{job=\"nodejs_api\"}[1m]) * 1000",
          "legendFormat": "Event loop lag",
          "refId": "A"
        }
      ]
    },
    {
      "id": 6,
      "type": "timeseries",
      "title": "Memory Usage",
      "gridPos": { "h": 8, "w": 12, "x": 12, "y": 16 },
      "datasource": { "type": "prometheus", "uid": "afjn3x99fpvr4b" },
      "fieldConfig": {
        "defaults": { "unit": "bytes", "color": { "mode": "palette-classic" } }
      },
      "targets": [
        {
          "datasource": { "type": "prometheus", "uid": "afjn3x99fpvr4b" },
          "expr": "nodejs_heap_size_used_bytes{job=\"nodejs_api\"}",
          "legendFormat": "Heap used",
          "refId": "A"
        },
        {
          "datasource": { "type": "prometheus", "uid": "afjn3x99fpvr4b" },
          "expr": "nodejs_heap_size_total_bytes{job=\"nodejs_api\"}",
          "legendFormat": "Heap total",
          "refId": "B"
        },
        {
          "datasource": { "type": "prometheus", "uid": "afjn3x99fpvr4b" },
          "expr": "nodejs_external_memory_bytes{job=\"nodejs_api\"}",
          "legendFormat": "External",
          "refId": "C"
        }
      ]
    },
    {
      "id": 7,
      "type": "timeseries",
      "title": "CPU Usage",
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 24 },
      "datasource": { "type": "prometheus", "uid": "afjn3x99fpvr4b" },
      "fieldConfig": {
        "defaults": { "unit": "percentunit", "color": { "mode": "palette-classic" } }
      },
      "targets": [
        {
          "datasource": { "type": "prometheus", "uid": "afjn3x99fpvr4b" },
          "expr": "rate(process_cpu_seconds_total{job=\"nodejs_api\"}[1m])",
          "legendFormat": "CPU usage",
          "refId": "A"
        }
      ]
    },
    {
      "id": 8,
      "type": "timeseries",
      "title": "Garbage Collection Duration",
      "gridPos": { "h": 8, "w": 12, "x": 12, "y": 24 },
      "datasource": { "type": "prometheus", "uid": "afjn3x99fpvr4b" },
      "fieldConfig": {
        "defaults": { "unit": "s", "color": { "mode": "palette-classic" } }
      },
      "targets": [
        {
          "datasource": { "type": "prometheus", "uid": "afjn3x99fpvr4b" },
          "expr": "rate(nodejs_gc_duration_seconds_sum{job=\"nodejs_api\"}[1m])",
          "legendFormat": "{{kind}} GC",
          "refId": "A"
        }
      ]
    },
    {
      "id": 9,
      "type": "stat",
      "title": "Total Requests (last 5m)",
      "gridPos": { "h": 4, "w": 6, "x": 0, "y": 32 },
      "datasource": { "type": "prometheus", "uid": "afjn3x99fpvr4b" },
      "fieldConfig": {
        "defaults": { "unit": "short", "color": { "mode": "thresholds" },
          "thresholds": { "steps": [{ "color": "green", "value": 0 }] }
        }
      },
      "targets": [
        {
          "datasource": { "type": "prometheus", "uid": "afjn3x99fpvr4b" },
          "expr": "sum(increase(http_request_duration_seconds_count{job=\"nodejs_api\"}[5m]))",
          "refId": "A"
        }
      ]
    },
    {
      "id": 10,
      "type": "stat",
      "title": "Error Rate %",
      "gridPos": { "h": 4, "w": 6, "x": 6, "y": 32 },
      "datasource": { "type": "prometheus", "uid": "afjn3x99fpvr4b" },
      "fieldConfig": {
        "defaults": { "unit": "percent", "color": { "mode": "thresholds" },
          "thresholds": { "steps": [
            { "color": "green", "value": 0 },
            { "color": "yellow", "value": 1 },
            { "color": "red", "value": 5 }
          ]}
        }
      },
      "targets": [
        {
          "datasource": { "type": "prometheus", "uid": "afjn3x99fpvr4b" },
          "expr": "sum(rate(http_request_duration_seconds_count{job=\"nodejs_api\", status_code=~\"[45]..\"}[5m])) / sum(rate(http_request_duration_seconds_count{job=\"nodejs_api\"}[5m])) * 100",
          "refId": "A"
        }
      ]
    },
    {
      "id": 11,
      "type": "stat",
      "title": "p95 Latency",
      "gridPos": { "h": 4, "w": 6, "x": 12, "y": 32 },
      "datasource": { "type": "prometheus", "uid": "afjn3x99fpvr4b" },
      "fieldConfig": {
        "defaults": { "unit": "s", "color": { "mode": "thresholds" },
          "thresholds": { "steps": [
            { "color": "green", "value": 0 },
            { "color": "yellow", "value": 0.5 },
            { "color": "red", "value": 1 }
          ]}
        }
      },
      "targets": [
        {
          "datasource": { "type": "prometheus", "uid": "afjn3x99fpvr4b" },
          "expr": "histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{job=\"nodejs_api\"}[5m])))",
          "refId": "A"
        }
      ]
    },
    {
      "id": 12,
      "type": "stat",
      "title": "Heap Used",
      "gridPos": { "h": 4, "w": 6, "x": 18, "y": 32 },
      "datasource": { "type": "prometheus", "uid": "afjn3x99fpvr4b" },
      "fieldConfig": {
        "defaults": { "unit": "bytes", "color": { "mode": "thresholds" },
          "thresholds": { "steps": [
            { "color": "green", "value": 0 },
            { "color": "yellow", "value": 200000000 },
            { "color": "red", "value": 500000000 }
          ]}
        }
      },
      "targets": [
        {
          "datasource": { "type": "prometheus", "uid": "afjn3x99fpvr4b" },
          "expr": "nodejs_heap_size_used_bytes{job=\"nodejs_api\"}",
          "refId": "A"
        }
      ]
    }
  ]
}