import React from 'react';
import { View, Image, Text, StyleSheet, Dimensions } from 'react-native';

// Test component to verify S3 image URL works
export default function TestImageComponent() {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Testing S3 Image Loading:</Text>

      <Image
        source={{
          uri: 'https://bhav-bhakti.s3.ap-south-1.amazonaws.com/assets/app_background_v1.png',
        }}
        style={styles.testImage}
        onLoad={() => {
          console.log('✅ Test image loaded successfully');
          setImageLoaded(true);
        }}
        onError={(error) => {
          console.log('❌ Test image failed:', error);
          setImageError(true);
        }}
        resizeMode="cover"
      />

      <Text style={styles.status}>
        Status: {imageError ? '❌ Failed' : imageLoaded ? '✅ Loaded' : '⏳ Loading...'}
      </Text>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#2C1810',
  },
  title: {
    fontSize: 18,
    color: '#F5E6D3',
    marginBottom: 20,
    textAlign: 'center',
  },
  testImage: {
    width: width - 40,
    height: 300,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#DAA520',
  },
  status: {
    fontSize: 16,
    color: '#DAA520',
    marginTop: 15,
    textAlign: 'center',
  },
});