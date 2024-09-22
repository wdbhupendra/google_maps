import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  PermissionsAndroid,
  Platform,
  Button,
  Alert,
  StyleSheet,
} from 'react-native';
import MapView, {Marker, Polyline} from 'react-native-maps';
import axios from 'axios';
import {GooglePlacesAutocomplete} from 'react-native-google-places-autocomplete';

const GOOGLE_MAPS_APIKEY = 'AIzaSyCtWLm1rihg6XQ4g7pAWw_xwYJ0IQ5qYKk';

const initialRegion = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 5,
  longitudeDelta: 5,
};

const App = () => {
  const [routeCoords, setRouteCoords] = useState([]);
  const [roadDistance, setRoadDistance] = useState(null);
  const [source, setSource] = useState(null);
  const [destination, setDestination] = useState(null);
  const mapRef = useRef(null);
  const sourceInputRef = useRef();
  const destinationInputRef = useRef();

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'This app needs access to your location.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('You can use the location');
      } else {
        console.log('Location permission denied');
      }
    }
  };

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const fetchDirections = async (sourceCoords, destinationCoords) => {
    if (!sourceCoords || !destinationCoords) return;

    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${sourceCoords.latitude},${sourceCoords.longitude}&destination=${destinationCoords.latitude},${destinationCoords.longitude}&key=${GOOGLE_MAPS_APIKEY}`,
      );

      if (response.data.routes.length) {
        const points = response.data.routes[0].overview_polyline.points;
        const distance = response.data.routes[0].legs[0].distance.text;

        const coords = decodePolyline(points);
        setRouteCoords(coords);
        setRoadDistance(distance);
        mapRef.current.fitToCoordinates([sourceCoords, destinationCoords], {
          edgePadding: {top: 50, right: 50, bottom: 50, left: 50},
          animated: true,
        });
      } else {
        Alert.alert('No routes found between the selected markers.');
        setRouteCoords([]);
        setRoadDistance(null);
      }
    } catch (error) {
      Alert.alert('Error fetching directions', error.message);
      setRouteCoords([]);
      setRoadDistance(null);
    }
  };

  const decodePolyline = t => {
    let points = [];
    let index = 0,
      len = t.length;
    let lat = 0,
      lng = 0;

    while (index < len) {
      let b,
        shift = 0,
        result = 0;
      do {
        b = t.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = t.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return points;
  };

  const handleSelectPlace = (details, type) => {
    const {lat, lng} = details.geometry.location;
    const location = {latitude: lat, longitude: lng};

    if (type === 'source') {
      setSource(location);
      if (destination) {
        fetchDirections(location, destination);
      }
    } else if (type === 'destination') {
      setDestination(location);
      if (source) {
        fetchDirections(source, location);
      }
    }

    mapRef.current.animateToRegion(
      {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      1000,
    );
  };

  const handleLongPress = event => {
    const {latitude, longitude} = event.nativeEvent.coordinate;
    const location = {latitude, longitude};

    if (!source) {
      setSource(location);
      if (destination) {
        fetchDirections(location, destination);
      }
    } else if (!destination) {
      setDestination(location);
      fetchDirections(source, location);
    }

    mapRef.current.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      1000,
    );
  };

  const handleClean = () => {
    setSource(null);
    setDestination(null);
    setRouteCoords([]);
    setRoadDistance(null);

    sourceInputRef.current.clear();
    destinationInputRef.current.clear();

    mapRef.current.animateToRegion(initialRegion, 1000);
  };

  return (
    <View style={{flex: 1}}>
      <MapView
        ref={mapRef}
        style={{flex: 1}}
        initialRegion={initialRegion}
        onLongPress={handleLongPress}
        onPress={() => console.log('Map pressed')}>
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="blue"
            strokeWidth={4}
          />
        )}

        {source && (
          <Marker coordinate={source} title="Source" pinColor="green" />
        )}

        {destination && (
          <Marker coordinate={destination} title="Destination" pinColor="red" />
        )}
      </MapView>

      <View style={styles.inputContainer}>
        <GooglePlacesAutocomplete
          ref={sourceInputRef}
          placeholder="Enter source"
          placeholderTextColor="black"
          onPress={(data, details = null) =>
            handleSelectPlace(details, 'source')
          }
          query={{
            key: GOOGLE_MAPS_APIKEY,
            language: 'en',
          }}
          fetchDetails
          styles={{
            textInput: styles.textInput,
            description: styles.suggestionText,
            listView: styles.listView,
          }}
        />

        <GooglePlacesAutocomplete
          ref={destinationInputRef}
          placeholder="Enter destination"
          placeholderTextColor="black"
          onPress={(data, details = null) =>
            handleSelectPlace(details, 'destination')
          }
          query={{
            key: GOOGLE_MAPS_APIKEY,
            language: 'en',
          }}
          fetchDetails
          styles={{
            textInput: styles.textInput,
            description: styles.suggestionText,
            listView: styles.listView,
          }}
        />
      </View>

      <Text style={{padding: 10, zIndex: 1}}>
        Road Distance: {roadDistance ? roadDistance : 'N/A'}
      </Text>

      <View style={{padding: 10, zIndex: 1}}>
        <Button title="Clean" onPress={handleClean} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    zIndex: 1,
  },
  textInput: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingLeft: 8,
    backgroundColor: 'white',
    color: 'black',
  },
  suggestionText: {
    color: 'black',
  },
  listView: {
    backgroundColor: 'white',
  },
});

export default App;
