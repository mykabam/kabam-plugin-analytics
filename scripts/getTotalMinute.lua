local total = 0
local keys = redis.call("keys", KEYS[1])
for i=1,# keys do
    local hits = tonumber(redis.call("get", keys[i]))
    total = total + hits
end
return total
