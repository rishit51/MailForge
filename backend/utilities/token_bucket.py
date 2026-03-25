import redis
import time
from config import Settings


REDIS_HOST = Settings.REDIS_URL


redis_client = redis.StrictRedis(host=REDIS_HOST, port = 6379, db=5)

# We use a float for tokens to accurately track fractional time, 
# and only allow consumption when tokens >= 1.0
lua_script = """
local bucket = KEYS[1]
local refill_rate = tonumber(ARGV[1])
local max_tokens = tonumber(ARGV[2])
local current_time = tonumber(ARGV[3])

-- 1. Fetch current state
local data = redis.call("HMGET", bucket, "tokens", "last_refill_time")
local tokens = tonumber(data[1])
local last_refill_time = tonumber(data[2])

-- 2. Initialize if it doesn't exist
if tokens == nil then
    tokens = max_tokens
    last_refill_time = current_time
end

-- 3. Calculate elapsed time (prevent negative time from clock drift)
local elapsed = math.max(0, current_time - last_refill_time)

-- 4. Add tokens (keeping it as a float to prevent fractional loss!)
tokens = math.min(tokens + (elapsed * refill_rate), max_tokens)

-- 5. Determine if we can consume
local allowed = 0
if tokens >= 1.0 then
    tokens = tokens - 1.0
    allowed = 1
end

-- 6. Save the new state (HSET is the modern equivalent of HMSET)
redis.call("HSET", bucket, 
    "tokens", tostring(tokens), 
    "last_refill_time", tostring(current_time)
)

-- 7. Set a TTL so old campaigns don't leak memory (e.g., expire in 24 hours)
-- Adjust this TTL based on your maximum expected campaign duration
redis.call("EXPIRE", bucket, 86400)

return allowed
"""

consume_token_script = redis_client.register_script(lua_script)

def consume_token(bucket_key: str, refill_rate_per_second: float, max_tokens: int) -> bool:
    """
    Attempts to consume a single token from the bucket.
    """
    result = consume_token_script(
        keys=[bucket_key],
        # time.time() provides float seconds, which gives us precise millisecond tracking
        args=[refill_rate_per_second, max_tokens, time.time()] 
    )
    return bool(result)