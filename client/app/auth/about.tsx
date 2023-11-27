import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, Text, View } from "../../components/Themed"
import { Dimensions, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { COLORS, FONT, SIZES } from '../../constants';
import { Formik } from 'formik';
import * as Yup from "yup";
import AppInput, { Select } from '../../components/AppInput/AppInput';
import AppBtn from '../../components/common/button/AppBtn';
import { useRouter } from 'expo-router';
import useVarious from '../../hook/useVarious';
import { stateLga } from '../../constants/states';
import { removeData, retrieveData, storeData } from '../../components/LocalStorage/LocalStorage';
import useAppDispatch from '../../hook/useAppDispatch';
import useAppSelector from '../../hook/useAppSelector';
import { clearUpdateProfileDetailStatus } from '../../store/reducers/authReducer';
import { updateProfileDetailAction } from '../../store/actions/authActions';
import Snackbar from '../../helpers/Snackbar';

const { width } = Dimensions.get('window');

const schema = Yup.object().shape({
    height: Yup.string().required().label("height"),
    build: Yup.string().label("build"),
    occupation: Yup.string().required().label("occupation"),
    bio: Yup.string().label("bio"),
    age: Yup.string().required().label("age"),
    state: Yup.string().required().label("state"),
});

const builds = [
    { label: 'Slim', value: 'slim' },
    { label: 'Athletic', value: 'athletic' },
    { label: 'Chubby', value: 'chubby' },
]

const About = () => {
    const router = useRouter();
    const { jobsData } = useVarious();
    const [state, setState] = useState([]);
    const [isError, setIsError] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [data, setData] = useState<any>(null);
    const dispatch = useAppDispatch();
    const authReducer = useAppSelector(state => state.authReducer);

    const handleSubmit = (values: any) => {

        const payload = {
            ...values,
            ...data,
        }
        console.log(payload, 'load')
        dispatch(updateProfileDetailAction(payload))
    }

    useEffect(() => {
        const newState = [];
        for (let key in stateLga) {
          newState.push({
            label: key,
            value: key.toLowerCase(),
          });
        }
        setState(newState);
    }, [stateLga]);

    useEffect(() => {
        const fetchData = async () => {
            try {
            const data = await retrieveData('profile-data');
            if (data) {
                const resource = JSON.parse(data)
                setData(resource)
            }
            } catch (error) {
            console.error(error);
            // Handle the error (e.g., show an error message)
            }
        };
    
        fetchData();
    }, []);

    useEffect(() => {
        if(authReducer.updateProfileDetailStatus === 'completed') {
            removeData("profile-data")
            router.push('/auth/gallery')
            dispatch(clearUpdateProfileDetailStatus())
        } else if(authReducer.updateProfileDetailStatus === 'failed') {
            setIsError(true)
            setError(authReducer.updateProfileDetailError)
            dispatch(clearUpdateProfileDetailStatus())
        }

    },[authReducer.updateProfileDetailStatus]);

    return (
        <SafeAreaView style={{flex: 1, backgroundColor: 'transparent'}}>
            <KeyboardAvoidingView
                style={styles.containerKey}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView showsVerticalScrollIndicator={false}
                    style={{
                        backgroundColor: 'transparent',
                        paddingHorizontal: 20
                    }}
                >
                    <Text
                        style={{
                            color: 'black',
                            fontFamily: FONT.extraBold,
                            fontSize: SIZES.xLarge,
                            marginTop: 20,
                            marginLeft: 5,
                            marginBottom: 40
                        }}
                    >
                        Tell us about you
                    </Text>
                    <Formik
                        initialValues={{ 
                            height: '', 
                            build: '', 
                            occupation: '',
                            bio: '',
                            age: '',
                            state: ''
                        }}
                        validationSchema={schema}
                        onSubmit={(values) => handleSubmit(values)}
                    >
                        {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                            <View style={styles.formContainer}>
                                <AppInput
                                    placeholder={'Height'}
                                    hasPLaceHolder={true}
                                    placeholderTop={'Height'}
                                    value={values.height}
                                    style={{
                                        width: 90/100 * width,
                                        borderColor: errors.height ? 'red' : COLORS.gray2
                                    }}
                                    headerStyle={{
                                        marginLeft: 10
                                    }}
                                    errorTextStyle={{
                                        marginLeft: 10
                                    }}
                                    onChangeText={handleChange('height')}
                                    // onBlur={handleBlur('height')}
                                    error={errors.height}
                                    touched={touched.height}
                                    keyboardType="numeric"
                                    showError={false}
                                />

                                <Select
                                    data={builds}
                                    onValueChange={handleChange('build')}
                                    value={values.build}
                                    hasPLaceHolder={true}
                                    placeholderTop='Build'
                                    showSelectError={false}
                                    placeholderLabel='Select an option...'
                                />

                                {Array.isArray(jobsData) && (
                                <Select
                                    data={jobsData}
                                    onValueChange={handleChange('occupation')}
                                    value={values.occupation}
                                    hasPLaceHolder={true}
                                    placeholderTop='Occupation'
                                    showSelectError={false}
                                    selectError={errors.occupation}
                                    placeholderLabel='Select an occupation...'
                                />)}

                                <View 
                                    style={{
                                        backgroundColor: 'transparent',
                                        display: 'flex',
                                        flexDirection: 'row',
                                        gap: 10
                                    }}
                                >
                                    {Array.isArray(state) && (
                                    <Select
                                        data={state}
                                        onValueChange={handleChange('state')}
                                        value={values.state}
                                        hasPLaceHolder={true}
                                        placeholderTop='State'
                                        showSelectError={false}
                                        selectError={errors.state}
                                        selectWidth={50/100 * width}
                                        placeholderLabel='Select a state...'
                                    />)}
                                    <AppInput
                                        placeholder={'Age'}
                                        hasPLaceHolder={true}
                                        placeholderTop={'Age'}
                                        value={values.age}
                                        style={{
                                            width: 35/100 * width,
                                            borderColor: errors.age ? 'red' : COLORS.gray2
                                        }}
                                        headerStyle={{
                                            marginLeft: 10
                                        }}
                                        errorTextStyle={{
                                            marginLeft: 1
                                        }}
                                        onChangeText={handleChange('age')}
                                        error={errors.age}
                                        touched={touched.age}
                                        keyboardType="numeric"
                                        showError={false}
                                    />
                                </View>
                                
                                <AppInput
                                    placeholder={'Bio'}
                                    hasPLaceHolder={true}
                                    placeholderTop={'Bio'}
                                    value={values.bio}
                                    style={{
                                        width: 90/100 * width,
                                        height: 150,
                                        borderColor: errors.bio ? 'red' : COLORS.gray2
                                    }}
                                    headerStyle={{
                                        marginLeft: 10
                                    }}
                                    errorTextStyle={{
                                        marginLeft: 10
                                    }}
                                    onChangeText={handleChange('bio')}
                                    multiline={true}
                                    showError={false}
                                    error={errors.bio}
                                    touched={touched.bio}
                                />
                                <AppBtn
                                    handlePress={() => handleSubmit()}
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
                                    spinner={authReducer.updateProfileDetailStatus === 'loading'}
                                    spinnerColor='white'
                                    spinnerStyle={{
                                        marginLeft: 10
                                    }}
                                />
                            </View>
                        )}
                    </Formik>
                </ScrollView>
            </KeyboardAvoidingView>
            <Snackbar
                isVisible={isError} 
                message={error}
                onHide={() => setIsError(false)}
                type='error'
            />
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    containerKey: {
        flex: 1,
    },
    formContainer: {
        flex: 1,
        gap: 20,
        backgroundColor: 'transparent',
        marginTop: 10,
        marginBottom: 100
    },
})

export default About;