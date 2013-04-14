var Async = require('async');

function AsyncLRU(options) {
    this.max = options.max;

    // A hasked where the key returns a node in the ordered link
    // list dta structure
    this._cache = {};

    // Simple linked list
    this._newest = null;
    this._oldest = null;

    // Number of items in the cache presently
    this.count = 0;
}

/**
 * Returns a value associated with the key and refreshes the 
 * keys value in the LRU order.  Returns null if not in LRU
 */
AsyncLRU.prototype.get = function(key) {
    var node = this._cache[key];
    if (!node) {
        return null;
    }

    if (node.previous) {
        node.previous.next = node.next;
    }
    if (node.next) {
        node.next.previous = node.previous;
    }
    node.next = this._newest;
    this._newest = node;

    return node.value;
};

//if no callback, then dispose won't be called when it is removed
AsyncLRU.prototype.remove = function(key, callback) {
    var node = this._cache[key];
    if (!node) {
        process.nextTick(function() {
            callback({ missing: true });
        });
        return;
    }

    delete this._cache[key];
    if (node.previous) {
        node.previous.next = node.next;
    }
    if (node.next) {
        node.next.previous = node.previous;
    }
    if (this._newest === node) {
        //console.log('removing newest');
        this._newest = node.next;
    }
    if (this._oldest === node) {
        //console.log('was oldest');
        //console.dir(node);
        this._oldest = node.previous;
        if (this._oldest) {
            this._oldest.next = null;
        }
    }
    --this.count;
    
    if (callback) {
        node.value.dispose(function(error) {
            callback(error);
        });
    }
};

AsyncLRU.prototype.set = function(key, value, callback) {

    // If there is an item with the same key, clean it up
    var self = this;
    this.remove(key, function(error) {
        if (error && !error.missing) {
            callback(error);
            return;
        }

        if (error && error.missing) {
            // no hit, increment current count
            ++self.count;
        }

        var node = { value: value, key: key };
        self._cache[key] = node;
        if (!self._newest) {
            //console.log('setting head');
            self._newest = self._oldest = node;
        }
        else {
            node.next = self._newest;
            self._newest.previous = node;
            self._newest = node;
        }

        //console.log(self.count);
        if (self.count > self.max) {
            self.remove(self._oldest.key, function(error) {
                callback(error);
            });
        }
        else {
            callback();
        }
    });
 };

AsyncLRU.prototype.dispose = function(options, callback) {

    if (typeof options === 'function') {
        callback = options;
        options = { asyncLimit: 10 };
    }
    
    var items = [], current = this._newest;
    while(current) {
        items.push(current.value);
        current = current.next;
    }

    Async.forEachLimit(
        items,
        options.asyncLimit,
        function(item, callback) {
            item.dispose(callback);
        },
        function(error) {
            callback(error);
        }
    );
};

module.exports = AsyncLRU;