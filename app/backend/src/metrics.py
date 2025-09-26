from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

# Total HTTP requests (by method, path, status)
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "path", "status"],
)


# HTTP request latency (by method, path) with predefined buckets
REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency",
    ["method", "path"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5),
)

# Return metrics in Prometheus text format for /metrics endpoint
def prometheus_app():
    return generate_latest().decode("utf-8")