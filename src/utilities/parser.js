// import DateUtils from '@date-io/date-fns';
const dateFns = require('date-fns')

const parser = {
  list_delimiter: '----------',
  isNumeric: function (n) {
    return !isNaN(parseFloat(n)) && isFinite(n)
  },
  isValidPassword: function (pwd) {
    // ^                  Start anchor
    // (?=.*[A-Z])        Ensure string has a uppercase letter.
    // (?=.*[0-9])        Ensure string has a digit.
    // (?=.*[a-z])        Ensure string has a lowercase letter.
    // .{8,100}           Ensure string is of length more than 8, less than 100.
    // $                  End anchor.
    var pattern = new RegExp(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).{8,100}$/)
    return pattern.test(pwd)
  },
  isValidEmail: function (email) {
    var pattern = new RegExp(/^([0-9a-zA-Z]([-+.\w]*[0-9a-zA-Z])*@([0-9a-zA-Z][-\w]*[0-9a-zA-Z]\.)+[a-zA-Z]{2,12})$/)
    return pattern.test(email)
  },
  isValidPhone: function (phone) {
    var pattern = new RegExp(/^([0-9]( |-)?)?(\(?[0-9]{3}\)?|[0-9]{3})( |-)?([0-9]{3}( |-)?[0-9]{4}|[a-zA-Z0-9]{7})$/)
    return pattern.test(phone)
  },
  isValidZip: function (zip) {
    var pattern = new RegExp(/^[0-9]{0,5}?$/)
    return pattern.test(zip)
  },
  getUTCDate: (dateString = Date.now()) => {
    const date = new Date(dateString);
    const res = new Date(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
    );
    return res
  },
  formatDate: function (val, format='MM/dd/yyyy') {
    try {
        if (!val) {return ''}
        const res = dateFns.format(new Date(val), format)
        return res
    } catch (error) {
        console.log('ERROR DATE SHort Date', error)
        return val
    }
  },
  shortDateTime: function (val) {
    try {
      return dateFns.format(new Date(val), 'Pp')
    } catch (error) {
      console.warn('Invalid date. SHort Time', error)
      return val
    }
  },
  isFutureDate: function (val) {
    if (!val) { return false }
    return dateFns.isFuture(new Date(val))
  },
  dateDistance: function (val) {
    try {
      const res = dateFns.formatDistance(new Date(val), new Date())
      return res
    } catch (error) {
      console.log('ERROR DATE Long Date', error)
      return val
    }
  },
  truncate: function (val, len) {
    if (!val || val.trim() === '' || val.length <= len) { return val }
    return val.substr(0, len) + (val.length > len ? '...' : '')
  },
  capitalize: function (value) {
    return value ? value.substr(0, 1).toUpperCase() +
      value.substr(1).toLowerCase() : ''
  },
  // Debounce returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The functions will ALL be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  debounce: function (func, wait, immediate) {
	  var timeout;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  }, 
  // Pass in the callback that we want to throttle and the delay between throttled events
  throttle: function (callback, delay) {
    // Create a closure around these variables.
    // They will be shared among all events handled by the throttle.
    let throttleTimeout = null;
    let storedEvent = null;

    // This is the function that will handle events and throttle callbacks when the throttle is active.
    const throttledEventHandler = event => {
      // Update the stored event every iteration
      storedEvent = event;

      // We execute the callback with our event if our throttle is not active
      const shouldHandleEvent = !throttleTimeout;

      // If there isn't a throttle active, we execute the callback and create a new throttle.
      if (shouldHandleEvent) {
        // Handle our event
        callback(storedEvent);

        // Since we have used our stored event, we null it out.
        storedEvent = null;

        // Create a new throttle by setting a timeout to prevent handling events during the delay.
        // Once the timeout finishes, we execute our throttle if we have a stored event.
        throttleTimeout = setTimeout(() => {
          // We immediately null out the throttleTimeout since the throttle time has expired.
          throttleTimeout = null;

          // If we have a stored event, recursively call this function.
          // The recursion is what allows us to run continusously while events are present.
          // If events stop coming in, our throttle will end. It will then execute immediately if a new event ever comes.
          if (storedEvent) {
            // Since our timeout finishes:
            // 1. This recursive call will execute `callback` immediately since throttleTimeout is now null
            // 2. It will restart the throttle timer, allowing us to repeat the throttle process
            throttledEventHandler(storedEvent);
          }
        }, delay);
      }
    };
    // Return our throttled event handler as a closure
    return throttledEventHandler;
  },
  sortByDate: function (array, o) {
    o.parser = function (x) {
      if (Date.parse(x)) {
        return new Date(x)
      } else { return new Date(1) }
    }
    return this.sortBy(array, o)
  },
  sortByBoolean: function (array, o) {
    o.parser = function (x) { return x.toString() }
    return this.sortBy(array, o)
  },
  sortBy: (function () {
    // cached privated objects
    var _toString = Object.prototype.toString
    // the default parser function
    var _parser = function (x) {
      var val = x[this.prop]
      if (val === '0' || val === 0) { return val }
      if (_toString.call(val) !== '[object Object]') { val = x }
      var y = parser.isNumeric(val) ? parseInt(val) : val
      return y
    }
    // gets the item to be sorted
    var _getItem = function (x) {
      return this.parser((x !== null && typeof x === 'object' && x[this.prop]) || x)
    }
    // Creates a method for sorting the Array
    // @array: the Array of elements
    // @o.prop: property name (if it is an Array of objects)
    // @o.desc: determines whether the sort is descending
    // @o.parser: function to parse the items to expected type
    return function (array, o) {
      if (!(array instanceof Array) || !array.length) {
        return []
      }
      if (_toString.call(o) !== '[object Object]') {
        o = {}
      }
      if (typeof o.parser !== 'function') {
        o.parser = _parser
      }
      o.desc = o.desc ? -1 : 1
      return array.sort(function (a, b) {
        a = _getItem.call(o, a)
        b = _getItem.call(o, b)
        return o.desc * (a < b ? -1 : +(a > b))
      })
    }
  }()),
  getExportFile: function (base64Data) {
    // helper function: generate a new file from base64 String
    const base64ToBlob = (dataurl) => {
      const arr = dataurl.split(',');
      const mime = arr[0].match(/:(.*?);/)[1]
      const sliceSize = 1024;
      const byteChars = window.atob(arr[1]);
      const byteArrays = [];

      for (let offset = 0, len = byteChars.length; offset < len; offset += sliceSize) {
        let slice = byteChars.slice(offset, offset + sliceSize);

        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);

        byteArrays.push(byteArray);
      }

      return new Blob(byteArrays, {type: mime});
    }

    const getFilename = (dataUrl) => {
      const arr = dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];

      return Math.round(+new Date()/1000) + '.' + mime.split('/').pop();
    }

    const blob = base64ToBlob(base64Data);
    blob.name = getFilename(base64Data);

    // generate file from base64 string
    return blob;
  },
  getCountryList: function () {
    return [
      { "label": "Australia", "value": "AU" },
      { "label": "USA", "value": "US" }
    ]
  },
  getStateList: function (country) {
    if (!country || country === 'AU') {
      return [
        { "label": "Australian Capital Territory", "value": "ACT" },
        { "label": "New South Wales", "value": "NSW" },
        { "label": "Northern Territory", "value": "NT" },
        { "label": "Queensland", "value": "QLD" },
        { "label": "South Australia", "value": "SA" },
        { "label": "Tasmania", "value": "TAS" },
        { "label": "Victoria", "value": "VIC" },
        { "label": "Western Australia", "value": "WA" },
      ]
    } else {
      return [
        { "label": "Alabama", "value": "AL" },
        { "label": "Alaska", "value": "AK" },
        { "label": "Arizona", "value": "AZ" },
        { "label": "Arkansas", "value": "AR" },
        { "label": "California", "value": "CA" },
        {
            "label": "Colorado",
            "value": "CO"
        },
        {
            "label": "Connecticut",
            "value": "CT"
        },
        {
            "label": "Delaware",
            "value": "DE"
        },
        {
            "label": "District Of Columbia",
            "value": "DC"
        },
        {
            "label": "Florida",
            "value": "FL"
        },
        {
            "label": "Georgia",
            "value": "GA"
        },
        {
            "label": "Hawaii",
            "value": "HI"
        },
        {
            "label": "Idaho",
            "value": "ID"
        },
        {
            "label": "Illinois",
            "value": "IL"
        },
        {
            "label": "Indiana",
            "value": "IN"
        },
        {
            "label": "Iowa",
            "value": "IA"
        },
        {
            "label": "Kansas",
            "value": "KS"
        },
        {
            "label": "Kentucky",
            "value": "KY"
        },
        {
            "label": "Louisiana",
            "value": "LA"
        },
        {
            "label": "Maine",
            "value": "ME"
        },
        {
            "label": "Maryland",
            "value": "MD"
        },
        {
            "label": "Massachusetts",
            "value": "MA"
        },
        {
            "label": "Michigan",
            "value": "MI"
        },
        {
            "label": "Minnesota",
            "value": "MN"
        },
        {
            "label": "Mississippi",
            "value": "MS"
        },
        {
            "label": "Missouri",
            "value": "MO"
        },
        {
            "label": "Montana",
            "value": "MT"
        },
        {
            "label": "Nebraska",
            "value": "NE"
        },
        {
            "label": "Nevada",
            "value": "NV"
        },
        {
            "label": "New Hampshire",
            "value": "NH"
        },
        {
            "label": "New Jersey",
            "value": "NJ"
        },
        {
            "label": "New Mexico",
            "value": "NM"
        },
        {
            "label": "New York",
            "value": "NY"
        },
        {
            "label": "North Carolina",
            "value": "NC"
        },
        {
            "label": "North Dakota",
            "value": "ND"
        },
        {
            "label": "Ohio",
            "value": "OH"
        },
        {
            "label": "Oklahoma",
            "value": "OK"
        },
        {
            "label": "Oregon",
            "value": "OR"
        },
        {
            "label": "Pennsylvania",
            "value": "PA"
        },
        {
            "label": "Rhode Island",
            "value": "RI"
        },
        {
            "label": "South Carolina",
            "value": "SC"
        },
        {
            "label": "South Dakota",
            "value": "SD"
        },
        {
            "label": "Tennessee",
            "value": "TN"
        },
        {
            "label": "Texas",
            "value": "TX"
        },
        { "label": "Utah", "value": "UT" },
        { "label": "Vermont", "value": "VT" },
        { "label": "Virginia", "value": "VA" },
        { "label": "Washington", "value": "WA" },
        { "label": "West Virginia", "value": "WV" },
        { "label": "Wisconsin", "value": "WI" },
        { "label": "Wyoming", "value": "WY" }
      ]
    }
  }
}

module.exports = parser
