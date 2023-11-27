import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, Text, View } from '../../components/Themed';
import { Button, Image, ImageBase, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import AppBtn from '../../components/common/button/AppBtn';
import { COLORS, FONT, SIZES, icons, images } from '../../constants';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import useAppDispatch from '../../hook/useAppDispatch';
import useAppSelector from '../../hook/useAppSelector';
import { galleryAction } from '../../store/actions/authActions';
import Snackbar from '../../helpers/Snackbar';
import { clearGalleryStatus } from '../../store/reducers/authReducer';
import { extractFileNameFromUri } from '../../Utils/Generic';

const Gallery = () => {
    const router = useRouter();
    const [image, setImage] = useState<any>([]);
    const [isUploadModalVisible, setUploadModalVisible] = useState<boolean>(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number>(-1);
    const [imagePreview, setImagePreview] = useState(null);
    const [imagesArray, setImagesArray] = useState([]);
    const [error, setError] = useState<string>('');
    const [isError, setIsError] = useState<boolean>(false);

    const dispatch = useAppDispatch();
    const authReducer = useAppSelector(state => state.authReducer);

    const openImagePicker = async () => {
        try {
          const options: ImagePicker.ImagePickerOptions = {
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
          };
      
          const result = await ImagePicker.launchImageLibraryAsync(options);
      
          if (!result.canceled) {
            // Use the assets array to get the image URI
            const imageUri = result.assets?.[0];
            
            if (imageUri) {
                setImagesArray([...imagesArray, imageUri]);
                setImagePreview(imageUri)
            } else {
              console.log('No image URI found in the assets array.');
            }
          }
        } catch (error) {
          console.error('Error picking an image:', error);
        }
    };
      
    const renderImage = (image: any, index: number) => (
        <TouchableOpacity
          key={index}
          onPress={() => handleImagePress(index)}
        >
            <Image
                key={index}
                source={image}
                style={{ 
                    width: image.width,
                    height: image.height,
                    borderRadius: 8
                }}
            />
        </TouchableOpacity>
    );

    const handleImagePress = (index: number) => {
        if (image[index]) {
          setSelectedImageIndex(index);
          setUploadModalVisible(true);
        } else {
          console.log('Open modal for image upload');
        }
    };

    const handleSendPhotos = () => {
        const newArr = image.map((imageObject: any) => ({
            uri: imageObject.uri,
            name: imageObject.fileName || extractFileNameFromUri(imageObject.uri),
            type: `${imageObject.type}/${imageObject.uri.split('.')[1]}`,
            size: imageObject.fileSize
        }));
        
        dispatch(galleryAction(newArr))

    }

    useEffect(() => {
        const imgWithDimensions = imagesArray.map((img, index) => ({
            ...img,
            width: index < 2 ? 107: 70,
            height: index < 2 ? 107 : 70
        }));

        setImage(imgWithDimensions)
    },[imagePreview, imagesArray]);

    useEffect(() => {
        if(authReducer.galleryStatus === 'completed') {
            router.push('/auth/notification')
            dispatch(clearGalleryStatus())
        } else if (authReducer.galleryStatus === 'failed') {
            setIsError(true)
            setError(authReducer.galleryError)
            dispatch(clearGalleryStatus())
        }
    },[authReducer.galleryStatus]);
    
    return (
        <SafeAreaView style={{flex: 1, backgroundColor: 'transparent'}}>
            <ScrollView style={{backgroundColor: 'transparent'}}>
                <View style={styles.backBtnContainer}>
                    <Text/>
                    <Text
                        onPress={() => router.push('/auth/profile-detail')}
                        style={{
                            fontFamily: FONT.bold,
                            color: COLORS.primary,
                            fontSize: SIZES.medium,
                            marginRight: 30
                        }}
                    >
                        Skip
                    </Text>
                </View>
                <View style={styles.container}>
                    <Text
                        style={{
                            marginTop: 40,
                            fontFamily: FONT.extraBold,
                            fontSize: SIZES.xxLarge,
                            color: 'black', marginBottom: 10
                        }}
                    >
                        Create a gallery
                    </Text>
                    <Text
                        style={{
                            fontFamily: FONT.regular,
                            fontSize: SIZES.medium,
                            color: COLORS.tertiary,
                            marginBottom: 20
                        }}
                    >
                        Only upload supported file format eg: jpeg, jpg, png
                    </Text>

                    {imagesArray.length !== 0 ? 
                        (
                            <>
                                <Text style={{
                                    color: 'black',
                                    fontFamily: FONT.bold,
                                    marginTop: 90,
                                    alignSelf: 'center'
                                }}>{imagesArray.length}/5</Text>
                                <View style={styles.firstImageSet} >
                                    {image.slice(0,2).map(renderImage)}
                                </View>
                                <View style={styles.secondImageSet} >
                                    {image.slice(2).map((img: any, index: number) => renderImage(img, index + 2))}
                                </View>
                            </>
                        ) : (
                            <>
                                <TouchableOpacity
                                    style={styles.uploadImage1}
                                    onPress={openImagePicker}
                                >
                                    <Text
                                        style={{
                                            color: 'black',
                                            fontFamily: FONT.regular,
                                            fontSize: SIZES.medium
                                        }}
                                    >Upload Image</Text>
                                    <FontAwesome
                                        name="upload"
                                        size={20}
                                        color={COLORS.gray}
                                    />
                                </TouchableOpacity>
                            </>   
                        )
                        
                    }

                    {/* Modal for image upload or viewing */}
                    <Modal
                        visible={isUploadModalVisible}
                        transparent={true}
                        onRequestClose={() => setUploadModalVisible(false)}
                    >
                        <View style={{ 
                                flex: 1, 
                                justifyContent: 'center', 
                                alignItems: 'center',
                                backgroundColor: 'rgba(0, 0, 0, 0.5)'
                            }}
                        >
                            {selectedImageIndex !== -1 && image[selectedImageIndex] ? (
                                <Image
                                    source={image[selectedImageIndex] }
                                    style={{ 
                                        width: '90%', 
                                        height: '60%',
                                        position: 'absolute',
                                        borderRadius: 20
                                    }}
                                />
                            ) : (
                                <Text>Upload Image Modal (Implement your logic)</Text>
                            )}
                            <View
                                style={{
                                    position: 'relative',
                                    alignSelf: 'flex-end',
                                    marginTop: -430,
                                    marginRight: 30,
                                    backgroundColor: 'transparent',
                                    flexDirection: 'row',
                                    gap: 20
                                }}
                            >
                                <TouchableOpacity 
                                    onPress={() => {
                                        image.splice(selectedImageIndex, 1);
                                        imagesArray.splice(selectedImageIndex, 1);
                                        setUploadModalVisible(false)
                                    }}
                                    style={styles.delete}
                                >
                                    <FontAwesome
                                        name="trash"
                                        size={20}
                                        color={'white'}
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    onPress={() => setUploadModalVisible(false)}
                                    style={styles.close}
                                >
                                    <Text style={{
                                        color: 'white',
                                        fontFamily: FONT.bold
                                    }}>Close</Text>
                                </TouchableOpacity>
                            </View>
                            
                        </View>
                    </Modal>

                    {(imagesArray.length < 5 && imagesArray.length !== 0) && (<TouchableOpacity
                        style={styles.uploadImage}
                        onPress={openImagePicker}
                        disabled={imagesArray.length === 5}
                    >
                        <Text
                            style={{
                                color: 'black' 
                            }}
                        >Upload Image</Text>
                        <FontAwesome
                            name="upload"
                            size={20}
                            color={COLORS.gray}
                        />
                    </TouchableOpacity>)}
                    
                </View>
            </ScrollView>
            <AppBtn
                handlePress={() => handleSendPhotos()}
                isText={true}
                btnTitle={'Continue'} 
                btnWidth={'90%'} 
                btnHeight={60} 
                btnBgColor={COLORS.primary}
                btnTextStyle={{
                    fontSize: SIZES.medium,
                    fontFamily: FONT.bold
                }}
                btnStyle={{
                    marginBottom: 20,
                    marginTop: 40,
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    alignSelf: 'center'
                }}
                spinner={authReducer.galleryStatus === 'loading'}
                spinnerColor='white'
                spinnerStyle={{
                    marginLeft: 10
                }}
            />
            <Snackbar
                isVisible={isError} 
                message={error}
                onHide={() => setIsError(false)}
                type='error'
            />
        </SafeAreaView>
    )
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'transparent',
        flex: 1,
        paddingHorizontal: 20
    },
    backBtnContainer: {
        backgroundColor: 'transparent',
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 15,
        marginTop: 25,
        marginBottom: -10
    },
    uploadImage1: {
        borderStyle: 'dashed',
        borderWidth: 1,
        backgroundColor: 'transparent',
        alignSelf: 'center',
        width: 200,
        flexDirection: 'row',
        borderColor: COLORS.gray2,
        paddingVertical: 10,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        marginBottom: 80,
        height: 200,
        marginTop: 40
    },
    uploadImage: {
        borderStyle: 'dashed',
        borderWidth: 1,
        backgroundColor: 'transparent',
        alignSelf: 'center',
        width: '50%',
        flexDirection: 'row',
        borderColor: COLORS.gray2,
        paddingVertical: 10,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        marginBottom: 80
    },
    close: {
        borderRadius: 20,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary
    },
    delete: {
        borderRadius: 20,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary
    },
    firstImageSet: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        backgroundColor: 'transparent',
        gap: 5, marginBottom: 5,
        marginTop: 20
    },
    secondImageSet: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        backgroundColor: 'transparent',
        gap: 5, marginBottom: 10
    }
});

export default Gallery;