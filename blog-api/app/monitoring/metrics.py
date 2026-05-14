from prometheus_client import Counter, Histogram

# Post metrics
blog_posts_total = Counter(
    "blog_posts_total", 
    "Total number of posts created"
)

# Comment metrics
blog_comments_total = Counter(
    "blog_comments_total", 
    "Total number of comments created"
)

# Cache metrics
cache_hits_total = Counter(
    "cache_hits_total", 
    "Total number of cache hits"
)

cache_misses_total = Counter(
    "cache_misses_total", 
    "Total number of cache misses"
)

# Auth metrics
auth_login_success_total = Counter(
    "auth_login_success_total", 
    "Total number of successful logins"
)

auth_login_failure_total = Counter(
    "auth_login_failure_total", 
    "Total number of failed logins"
)

# Database metrics
db_query_duration_seconds = Histogram(
    "db_query_duration_seconds",
    "Time spent executing database queries",
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 5.0]
)
