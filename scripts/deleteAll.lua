local total = 0
local keys = redis.call("keys", KEYS[1])
for i=1,# keys do
   redis.call("del", keys[i])
end
