import React, { useEffect, useRef, useState } from 'react';
import { 
    Alert, 
    Button, 
    Dimensions, 
    Image, 
    Platform, 
    SafeAreaView, ScrollView, 
    StyleSheet, 
    TouchableHighlight, 
    TouchableOpacity
} from "react-native";
import { View, Text } from '../../components/Themed';
import AppBtn from '../../components/common/button/AppBtn';
import { useRouter } from 'expo-router';
import { COLORS, FONT, SIZES, images } from '../../constants';
import AppInput, { Phone } from '../../components/AppInput/AppInput';
import { Formik } from 'formik';
import * as Yup from "yup";
import * as LocalAuthentication from 'expo-local-authentication';
import useAppDispatch from '../../hook/useAppDispatch';
import useAppSelector from '../../hook/useAppSelector';
import { enterPasswordResetCodeAction, resetPasswordAction, savePasswordAfterResetAction, signInAction } from '../../store/actions/authActions';
import { clearEnterPasswordCodeStatus, clearEnterPasswordStatus, clearResetPasswordStatus, clearSignInStatus } from '../../store/reducers/authReducer';
import Snackbar from '../../helpers/Snackbar';
import ReusableModal from '../../components/Modal/ReusableModal';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import OTPTextView from 'react-native-otp-textinput';
import { getTokenFromSecureStore } from '../../components/ExpoStore/SecureStore';
import settings from '../../config/settings';
import { decode as base64Decode } from 'base-64';

const { width, height } = Dimensions.get('window');

const schema = Yup.object().shape({
  emailOrPhone: Yup.string().required('required field').test('emailOrPhone', 'Invalid phone or email', value => {
    const isEmail = Yup.string().email().isValidSync(value);
    const isPhoneNumber = /^\d{11}$/.test(value as string);
    return isEmail || isPhoneNumber;
  }),
  password: Yup.string()
    .matches(
        /^(?=.*\d)(?=.*[a-z])(?=.*\W)(?=.*[A-Z])(?=.*[a-zA-Z]).{8,20}$/,
        'Password does not meet requirement.'
    )
    .required('Password is required')
    .label('Password')
});

const resetPasswordSchema = Yup.object().shape({
    password: Yup.string()
        .matches(
            /^(?=.*\d)(?=.*[a-z])(?=.*\W)(?=.*[A-Z])(?=.*[a-zA-Z]).{8,20}$/,
            'Password does not meet requirement.'
        )
        .required('Password is required')
        .label('Password'),
    confirmPassword: Yup.string()
        .oneOf([Yup.ref('password')], 'Confirm password and password do not match ')
        .required('Confirm password is required')
        .label('Confirm Password'),
});

const Login = () => {
    const router = useRouter();
    const [isBiometricSupport, setIsBiometricSupport] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [signInError, setSignInError] = useState<boolean>(false);
    const [success, setSuccess] = useState<string>('');
    const [isResestPasswordSuccess, setIsResetPasswordSuccess] = useState<boolean>(false);
    const [forgotPasswordError, setForgotPasswordError] = useState<string>('');
    const [isForgotPasswordError, setIsForgotPasswordError] = useState<boolean>(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalVisibleToken, setModalVisibleToken] = useState(false);
    const [enterPasswordModal, setEnterPasswordModal] = useState(false);
    const [otp, setOtp] = useState<string>('');
    const [count, setCount] = useState<number>(120);
    const [formattedValue, setFormattedValue] = useState("");
    const otpRef = useRef<any>(null);

    const dispatch = useAppDispatch();
    const authReducer = useAppSelector(state => state.authReducer);

    const fallBackToDefaultAuth = () => {
        console.log('fall back to password auth')
    }

    const alertComponent = (title: string, mess: string, btnTxt: string, btnFunc: any) => {
        return Alert.alert(title, mess, [
            {
                text: btnTxt,
                onPress: btnFunc
            }
        ]);
    };

    const handleSignIn = (values: {emailOrPhone: string, password: string}) => {
        const credencial = values.emailOrPhone.startsWith('0')
                        ? values.emailOrPhone.replace('0', '234') 
                        : values.emailOrPhone.toLowerCase();

         const payload = {
            emailOrPhone: credencial,
            password: values.password
         }

         dispatch(signInAction(payload))
    }

    const handleBiometricAuth = async () => {
        // check if hardware supports biometric
        const isBiometricAvailable = await LocalAuthentication.hasHardwareAsync();
  
        //fallback to default aith method (pass) if biometric is not available
        if(!isBiometricAvailable)
            return alertComponent(
                'Please Enter Your Password',
                'Biometric Auth not Supported',
                'Ok',
                () => fallBackToDefaultAuth()
            );
  
            // check biometric types available (fingerprint, facial, iris recognition)
            let supportedBiometrics: any;
            if(isBiometricAvailable)
                supportedBiometrics = await LocalAuthentication.supportedAuthenticationTypesAsync()
  
            // check biometric are saved locally in users device
            const savedBiometrics = await LocalAuthentication.isEnrolledAsync()
            if(!savedBiometrics)
                return alertComponent(
                    'Biometric record not found',
                    'Please Login With Password',
                    'Ok',
                    () => fallBackToDefaultAuth()
                );
  
            //authenthenticate with biometric
            const biometricAuth = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Login with biometric',
                cancelLabel: 'cancel',
                disableDeviceFallback: true
            })
  
            //Log the user in on success
            // if(biometricAuth) {TwoButtonAlert()}
            // console.log(isBiometricAvailable)
            // console.log(supportedBiometrics)
            // console.log(savedBiometrics)
            console.log(biometricAuth)
  
    };

    const handleResetPassword = (values: any) => {
        const phone = formattedValue.startsWith('+') && (formattedValue.replace('+', ''));

        dispatch(savePasswordAfterResetAction({
            phone: phone,
            password: values.password,
            confirmPassword: values.confirmPassword
        }))
    }

    const handlePasswordChange = () => {
        const phone = formattedValue.startsWith('+') && (formattedValue.replace('+', ''));
        dispatch(resetPasswordAction({phone: phone}))
    }

    const formatTime = (time: any) => {
        const minutes = Math.floor(time / 60);
        const seconds = time % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const handleSubmitToken = () => {
        const phone = formattedValue.startsWith('+') && (formattedValue.replace('+', ''));
        if(count === 0) {
            setIsForgotPasswordError(true)
            setForgotPasswordError('Password reset timedout, resend code.')
            return;
        }

        dispatch(enterPasswordResetCodeAction({
            phone: phone,
            passwordResetCode: otp
        }))
    }

    useEffect(() => {
        (async () => {
            const compatible = await LocalAuthentication.hasHardwareAsync();
            setIsBiometricSupport(compatible);
        })();
    });

    useEffect(() => {
        const intervalId = setTimeout(() => {
            if (count > 0) {
              setCount(count - 1);
            }
          }, 1000);
      
          return () => {
            clearTimeout(intervalId);
          };
    },[count]);

    useEffect(() => {
        let intervalId: any;
        if(authReducer.resetPasswordStatus === 'completed') {
            setModalVisible(false)
            setModalVisibleToken(true)
            setCount(120)
            dispatch(clearResetPasswordStatus())
        } else if(authReducer.resetPasswordStatus === 'failed') {
            setIsForgotPasswordError(true)
            setForgotPasswordError(authReducer.resetPasswordError)
            dispatch(clearResetPasswordStatus())
            setTimeout(() => {
                setIsForgotPasswordError(false)
                setForgotPasswordError('')
            },5000)
        }

        return () => {
            clearInterval(intervalId);
        }
    },[authReducer.resetPasswordStatus]);

    useEffect(() => {
        let intervalId: any;
        if(authReducer.enterPasswordResetCodeStatus === 'completed') {
            setModalVisibleToken(false)
            setEnterPasswordModal(true)
            setCount(0)
            dispatch(clearEnterPasswordCodeStatus())
            setForgotPasswordError('')
        } else if(authReducer.enterPasswordResetCodeStatus === 'failed') {
            setIsForgotPasswordError(true)
            setForgotPasswordError(authReducer.enterPasswordResetCodeError)
            dispatch(clearEnterPasswordCodeStatus())
            setTimeout(() => {
                setIsForgotPasswordError(false)
                setForgotPasswordError('')
            },5000)
        }

        return () => {
            clearInterval(intervalId);
        }
    },[authReducer.enterPasswordResetCodeStatus]);

    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        if(authReducer.enterPasswordStatus === 'completed') {
            setEnterPasswordModal(false)
            setIsResetPasswordSuccess(true)
            setFormattedValue('')
            setSuccess(authReducer.enterPasswordSuccess)
            dispatch(clearEnterPasswordStatus())
        } else if(authReducer.enterPasswordStatus === 'failed') {
            setIsForgotPasswordError(true)
            setForgotPasswordError(authReducer.enterPasswordError)
            dispatch(clearEnterPasswordStatus())
            intervalId = setTimeout(() => {
                setIsForgotPasswordError(false)
                setForgotPasswordError('')
            },5000)
        }

        return () => {
            clearInterval(intervalId);
        }
    },[authReducer.enterPasswordStatus]);

    useEffect(() => {
        const fetchData = async () => {
          try {
            
            if (authReducer.signInStatus === 'completed') {
                const data = await getTokenFromSecureStore(settings.auth.admin);
                const payloadBase64 = data && data.split('.')[1];
                const decodedPayload = base64Decode(payloadBase64);
                const decodedPayloadJSON = JSON.parse(decodedPayload);

                decodedPayloadJSON.level < 2 
                    ? router.push('/auth/gender') 
                    : router.push('/(tabs)/one')

                dispatch(clearSignInStatus())

            } else if(authReducer.signInStatus === 'failed') {
                setSignInError(true)
                setError(authReducer.signInError)
                dispatch(clearSignInStatus())
            }
          } catch (error) {
            console.error(error);
            // Handle the error (e.g., show an error message)
          }
        };
    
        fetchData();
    }, [authReducer.signInStatus]);

    return (
        <SafeAreaView style={{height: height, backgroundColor: 'transparent', marginBottom: 30}}>
            <ScrollView showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.scrollViewContent}
            >
                <View style={styles.container}>
                    <Text
                        style={{
                            fontFamily: FONT.extraBold,
                            fontSize: SIZES.xxLarge,
                            color: 'black', marginBottom: 10,
                            marginTop: 50
                        }}
                    >
                        Welcome back
                    </Text>
                    <Formik
                        initialValues={{ emailOrPhone: '', password: '' }}
                        validationSchema={schema}
                        onSubmit={(values) => handleSignIn(values)}
                    >
                        {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                            <View style={styles.formContainer}>
                                <AppInput
                                    placeholder={'Your email or phone'}
                                    hasPLaceHolder={true}
                                    placeholderTop={'Email or Phone'}
                                    value={values.emailOrPhone.toLowerCase()}
                                    style={{
                                        width: 80/100 * width
                                    }}
                                    onChangeText={handleChange('emailOrPhone')}
                                    onBlur={handleBlur('emailOrPhone')}
                                    error={errors.emailOrPhone}
                                    touched={touched.emailOrPhone}
                                />
                                <AppInput
                                    placeholder='Password'
                                    hasPLaceHolder={true}
                                    placeholderTop='Password'
                                    value={values.password}
                                    style={{
                                        width: 80/100 * width
                                    }}
                                    secureTextEntry={true}
                                    onChangeText={handleChange('password')}
                                    onBlur={handleBlur('password')}
                                    error={errors.password}
                                    touched={touched.password}
                                />

                                <Text
                                    onPress={() => setModalVisible(true)}
                                    style={{
                                        alignSelf: 'flex-end',
                                        color: 'black',
                                        fontFamily: FONT.regular,
                                        fontSize: SIZES.small
                                    }}
                                >Forgot Password?</Text>
                                <View
                                    style={{
                                        backgroundColor: 'transparent',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center'
                                    }}
                                >
                                    <AppBtn
                                        handlePress={() => handleSubmit()}
                                        isText={true}
                                        btnTitle={'Sign in'} 
                                        btnWidth={'100%'} 
                                        btnHeight={60} 
                                        btnBgColor={COLORS.primary}
                                        btnTextStyle={{
                                            fontSize: SIZES.medium,
                                            fontFamily: FONT.bold
                                        }}
                                        btnStyle={{
                                            marginBottom: 20,
                                            marginTop: 20,
                                            display: 'flex',
                                            flexDirection: 'row',
                                            justifyContent: 'center',
                                            alignItems: 'center'
                                        }}
                                        spinner={authReducer.signInStatus === 'loading'}
                                        spinnerColor='white'
                                        spinnerStyle={{
                                            marginLeft: 10
                                        }}
                                    />
                                </View>
                            </View>
                        )}
                    </Formik>

                    <View
                        style={{
                            backgroundColor: 'transparent',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            flexDirection: 'column'
                        }}
                    >
                        {isBiometricSupport && (<View
                            style={{
                                backgroundColor: 'transparent',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                flexDirection: 'column',
                                gap: 35
                            }}
                        >
                            <Text
                                style={{
                                    fontFamily: FONT.medium,
                                    fontSize: SIZES.medium,
                                    color: COLORS.tertiary,
                                    marginTop: 20
                                }}
                            >
                                - or -
                            </Text>
                            <TouchableHighlight
                                underlayColor={COLORS.gray2}
                                onPress={() => handleBiometricAuth()}
                            >
                                <Image
                                    source={images.face_id}
                                    style={{
                                        width: 30,
                                        height: 30
                                    }}
                                    resizeMode='contain'
                                />
                            </TouchableHighlight>
                        </View>)}
                        
                        <View
                            style={{
                                backgroundColor: 'transparent',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                flexDirection: 'row',
                                marginTop: 40,
                                marginBottom: 50
                            }}
                        >
                            <Text
                                style={{
                                    fontFamily: FONT.medium,
                                    fontSize: 14,
                                    color: COLORS.tertiary
                                }}
                            >Don't have an account?</Text>
                            <Text
                                onPress={() => router.push('/unauth/sign-up')}
                                style={{
                                    fontFamily: FONT.bold,
                                    fontSize: 14,
                                    color: COLORS.primary,
                                    marginLeft: 2
                                }}
                            >Sign Up</Text>
                        </View>
                    </View>
                    
                </View>
                <Snackbar 
                    isVisible={signInError} 
                    message={error}
                    onHide={() => setSignInError(false)}
                    type='error'
                />
                <Snackbar 
                    isVisible={isResestPasswordSuccess} 
                    message={success}
                    onHide={() => setIsResetPasswordSuccess(false)}
                    type='success'
                />
                <ReusableModal
                    modalVisible={modalVisible}
                    setModalVisible={setModalVisible}
                    style={{
                        backgroundColor: 'white',
                        padding: 20,
                        borderRadius: 20,
                        width: '90%',
                    }}
                    animationViewStyle={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                    modalHeightKeyboardClose={'50%'}
                    modalHeightKeyboardOpen={Platform.select({ios: '50%', android: '55%'})}
                >
                    <View
                        style={{
                            backgroundColor: 'transparent',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'flex-end'
                        }}
                    >
                        <TouchableOpacity
                            onPress={() => {
                                setFormattedValue('')
                                setModalVisible(false)
                            }}
                        >
                            <FontAwesome
                                name="close"
                                size={20}
                                color={COLORS.primary}
                            />
                        </TouchableOpacity>
                    </View>
                    <View
                        style={{
                            backgroundColor: 'transparent',
                            justifyContent: 'center',
                            alignItems: 'center',
                            flex: 1
                        }}
                    >
                        <Text 
                            style={{
                                color: 'black',
                                fontFamily: FONT.regular,
                                fontSize: 14,
                                alignSelf: 'center',
                                textAlign: 'center'
                            }}
                        >
                            Enter your phone number below and we will send you an OTP to reset your password.
                        </Text>
                        <Phone 
                            setFormattedValue={setFormattedValue}
                            containerStyle={styles.containerStyle}
                            textContainerStyle={styles.textContainerStyle}
                        />
                        <Text
                            style={{
                                fontFamily: FONT.regular,
                                fontSize: 14,
                                color: 'red',
                                marginTop: 10
                            }}
                        >
                            {isForgotPasswordError ? forgotPasswordError : ''}
                        </Text>
                        <AppBtn
                            handlePress={() => handlePasswordChange()}
                            isText={true}
                            btnTitle={'Send'} 
                            btnWidth={'80%'} 
                            btnHeight={60} 
                            btnBgColor={COLORS.primary}
                            btnTextStyle={{
                                fontSize: SIZES.medium,
                                fontFamily: FONT.bold
                            }}
                            btnStyle={{
                                marginBottom: 10,
                                marginTop: 30,
                                display: 'flex',
                                flexDirection: 'row',
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}
                            spinner={authReducer.resetPasswordStatus === 'loading'}
                            spinnerColor='white'
                            spinnerStyle={{
                                marginLeft: 10
                            }}
                        />
                    </View>
                    
                </ReusableModal>

                <ReusableModal
                    modalVisible={modalVisibleToken}
                    setModalVisible={setModalVisibleToken}
                    style={{
                        backgroundColor: 'white',
                        padding: 20,
                        borderRadius: 20,
                        width: '90%',
                    }}
                    animationViewStyle={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                    modalHeightKeyboardClose={'50%'}
                    modalHeightKeyboardOpen={Platform.select({ios: '50%', android: '70%'})}
                >
                    <View
                        style={{
                            backgroundColor: 'transparent',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'flex-end'
                        }}
                    >
                        <TouchableOpacity
                            onPress={() => {
                                setCount(0)
                                setFormattedValue('')
                                setModalVisibleToken(false)
                            }}
                        >
                            <FontAwesome
                                name="close"
                                size={20}
                                color={COLORS.primary}
                            />
                        </TouchableOpacity>
                    </View>
                    <Text
                        style={{
                            color: 'black',
                            fontFamily: FONT.regular,
                            fontSize: SIZES.medium,
                            alignSelf: 'center',
                            textAlign: 'center',
                            marginVertical: 20
                        }}
                    >
                        Enter the four degit code that was sent to your phone.
                    </Text>
                    <View
                        style={{
                            backgroundColor: 'transparent',
                            justifyContent: 'center',
                            alignItems: 'center',
                            flex: 1, marginTop: 20
                        }}
                    >
                        <View style={styles.tokenContainer}>
                            <OTPTextView
                                ref={otpRef}
                                textInputStyle={{
                                    height: 60,
                                    width: 60, 
                                    borderWidth: 1,
                                    borderRadius: 10
                                }}
                                tintColor={COLORS.primary}
                                handleTextChange={(otp) => setOtp(otp)}
                                inputCount={4}
                                keyboardType="numeric"
                                autoFocus
                            />
                        </View>
                        <Text
                            style={{
                                color: 'black',
                                fontFamily: FONT.bold,
                                fontSize: SIZES.small,
                                alignSelf: 'center',
                                marginTop: 20
                            }}
                            onPress={handlePasswordChange}
                            disabled={count > 0}
                        >
                            {count ? `Resend in...${formatTime(count)}` : 'Send again'}
                        </Text>

                        <Text
                            style={{
                                fontFamily: FONT.regular,
                                fontSize: 14,
                                color: 'red',
                                marginTop: 10
                            }}
                        >
                            {isForgotPasswordError ? forgotPasswordError : ''}
                        </Text>
                        <AppBtn
                            handlePress={() => handleSubmitToken()}
                            isText={true}
                            btnTitle={'Send'} 
                            btnWidth={'80%'} 
                            btnHeight={60} 
                            btnBgColor={COLORS.primary}
                            btnTextStyle={{
                                fontSize: SIZES.medium,
                                fontFamily: FONT.bold
                            }}
                            btnStyle={{
                                marginBottom: 20,
                                marginTop: 10,
                                display: 'flex',
                                flexDirection: 'row',
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}
                            spinner={authReducer.enterPasswordResetCodeStatus === 'loading' || authReducer.resetPasswordStatus === 'loading'}
                            spinnerColor='white'
                            spinnerStyle={{
                                marginLeft: 10
                            }}
                        />
                    </View>
                    
                    
                </ReusableModal>

                <ReusableModal
                    modalVisible={enterPasswordModal}
                    setModalVisible={setEnterPasswordModal}
                    style={{
                        backgroundColor: 'white',
                        padding: 20,
                        borderRadius: 20,
                        width: '90%',
                        height: '55%'
                    }}
                    animationViewStyle={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                    modalHeightKeyboardClose={'55%'}
                    modalHeightKeyboardOpen={Platform.select({ios: '55%', android: '70%'})}
                >
                    <View
                        style={{
                            backgroundColor: 'transparent',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'flex-end'
                        }}
                    >
                        <TouchableOpacity
                            onPress={() => {
                                setFormattedValue('')
                                setCount(0)
                                setEnterPasswordModal(false)
                            }}
                        >
                            <FontAwesome
                                name="close"
                                size={20}
                                color={COLORS.primary}
                            />
                        </TouchableOpacity>
                    </View>
                    <Text
                        style={{
                            color: 'black',
                            fontFamily: FONT.bold,
                            fontSize: SIZES.large,
                            alignSelf: 'center',
                            textAlign: 'center',
                            marginVertical: 20
                        }}
                    >
                        Enter new password.
                    </Text>
                    <View
                        style={{
                            backgroundColor: 'transparent',
                            justifyContent: 'center',
                            alignItems: 'center',
                            flex: 1, marginTop: 20
                        }}
                    >
                        
                        <Formik
                            initialValues={{ confirmPassword: '', password: '' }}
                            validationSchema={resetPasswordSchema}
                            onSubmit={(values) => handleResetPassword(values)}
                        >
                            {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                                <View style={styles.formContainer}>
                                    <AppInput
                                        placeholder='Password'
                                        hasPLaceHolder={false}
                                        placeholderTop=''
                                        value={values.password}
                                        style={{
                                            width: 80/100 * width
                                        }}
                                        secureTextEntry={true}
                                        onChangeText={handleChange('password')}
                                        onBlur={handleBlur('password')}
                                        error={errors.password}
                                        touched={touched.password}
                                    />

                                    <AppInput
                                        placeholder='Confirm password'
                                        hasPLaceHolder={false}
                                        placeholderTop=''
                                        value={values.confirmPassword}
                                        style={{
                                            width: 80/100 * width
                                        }}
                                        secureTextEntry={true}
                                        onChangeText={handleChange('confirmPassword')}
                                        onBlur={handleBlur('confirmPassword')}
                                        error={errors.confirmPassword}
                                        touched={touched.confirmPassword}
                                    />

                                   {isForgotPasswordError && (<Text
                                        style={{
                                            fontFamily: FONT.regular,
                                            fontSize: 14,
                                            color: 'red',
                                            alignSelf: 'center',
                                            textAlign: 'center'
                                        }}
                                    >
                                        {forgotPasswordError}
                                    </Text>)}

                                    <View
                                        style={{
                                            backgroundColor: 'transparent',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <AppBtn
                                            handlePress={() => handleSubmit()}
                                            isText={true}
                                            btnTitle={'Sign in'} 
                                            btnWidth={'100%'} 
                                            btnHeight={60} 
                                            btnBgColor={COLORS.primary}
                                            btnTextStyle={{
                                                fontSize: SIZES.medium,
                                                fontFamily: FONT.bold
                                            }}
                                            btnStyle={{
                                                marginBottom: 20,
                                                marginTop: 20,
                                                display: 'flex',
                                                flexDirection: 'row',
                                                justifyContent: 'center',
                                                alignItems: 'center'
                                            }}
                                            spinner={authReducer.enterPasswordStatus === 'loading'}
                                            spinnerColor='white'
                                            spinnerStyle={{
                                                marginLeft: 10
                                            }}
                                        />
                                    </View>
                                </View>
                            )}
                        </Formik>
                    </View>
                    
                    
                </ReusableModal>
            </ScrollView>
            
        </SafeAreaView>
    )
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'transparent',
        width: width,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
    },
    tokenContainer: {
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        display: 'flex',
        marginTop: 10
    },
    scrollViewContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    agreeBtn: {
        backgroundColor: 'transparent',
        display: 'flex',
        gap: 10,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        marginTop: 20
    },
    backBtnContainer: {
        backgroundColor: 'transparent',
        width: width,
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        marginLeft: 15,
        marginTop: 25,
        marginBottom: 30
    },
    formContainer: {
        display: 'flex',
        gap: 20,
        backgroundColor: 'transparent',
        marginTop: 40
    },
    agree: {
        width: 20,
        height: 18,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 0.3,
        borderColor: COLORS.primary,
        borderRadius: 5,
        backgroundColor: 'transparent',
    },
    disagree: {
        width: 20,
        height: 18,
        borderWidth: 0.3,
        borderColor: COLORS.tertiary,
        borderRadius: 5,
        backgroundColor: 'transparent',
    },
    close: {
        borderRadius: 50,
        padding: 3,
        backgroundColor: COLORS.primary
    },
    containerStyle: {
        borderWidth: 0.3,
        borderColor: COLORS.gray2,
        borderRadius: 12,
        paddingHorizontal: 10,
        height: 55,
        backgroundColor: 'transparent',
        width: '100%',
        marginTop: 30
    },
    textContainerStyle: {
        backgroundColor: 'transparent',
    }
})

export default Login;